use axum::{
    extract::{Path, State},
    http::{header, HeaderValue},
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use once_cell::sync::Lazy;
use std::sync::Arc;
use tokio::sync::RwLock;

/// 内嵌 HTTP Server 的内存缓存（供局域网设备订阅）
#[derive(Default, Clone)]
pub struct Cache {
    pub tvbox_json: String,
    pub playlist_txt: String,
    pub resource_dir: String,
}

static CACHE: Lazy<Arc<RwLock<Cache>>> =
    Lazy::new(|| Arc::new(RwLock::new(Cache::default())));

pub async fn update_cache(key: &str, value: String) {
    let mut c = CACHE.write().await;
    match key.to_lowercase().as_str() {
        "tvbox" | "tvbox.json"      => c.tvbox_json = value,
        "playlist" | "playlist.txt" => c.playlist_txt = value,
        _ => {}
    }
}

pub async fn get_cache(key: &str) -> String {
    let c = CACHE.read().await;
    match key.to_lowercase().as_str() {
        "tvbox" | "tvbox.json"      => c.tvbox_json.clone(),
        "playlist" | "playlist.txt" => c.playlist_txt.clone(),
        _          => String::new(),
    }
}

type SharedCache = Arc<RwLock<Cache>>;

pub async fn run(port: u16) {
    let cache = CACHE.clone();
    let app = Router::new()
        .route("/",              get(index_handler))
        .route("/tvbox.json",    get(tvbox_handler))
        .route("/playlist.txt",  get(playlist_txt_handler))
        .route("/playlist.m3u",  get(playlist_m3u_handler))
        .route("/playlist.m3u8", get(playlist_m3u_handler))
        .route("/files/{*path}", get(file_handler))
        .fallback(get(fallback_handler))
        .with_state(cache);

    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await
        .unwrap_or_else(|_| panic!("无法绑定端口 {}", port));

    log::info!("内嵌HTTP服务启动在 {}", addr);
    axum::serve(listener, app).await.unwrap();
}

async fn index_handler() -> impl IntoResponse {
    html_response(r#"<!DOCTYPE html><html lang="zh"><body>
<h3>TVBox Studio 本地服务</h3>
<ul>
  <li><a href="/tvbox.json">tvbox.json</a> - TVBox配置文件</li>
  <li><a href="/playlist.txt">playlist.txt</a> - 直播源(TXT格式)</li>
  <li><a href="/playlist.m3u">playlist.m3u</a> - 直播源(M3U格式)</li>
</ul>
</body></html>"#)
}

async fn tvbox_handler(State(cache): State<SharedCache>) -> impl IntoResponse {
    let content = cache.read().await.tvbox_json.clone();
    if !content.is_empty() {
        return json_response(content);
    }
    // 若内存未命中，尝试从 resource_dir/tvbox.json 读取
    let root = cache.read().await.resource_dir.clone();
    if !root.is_empty() {
        let path = std::path::Path::new(&root).join("tvbox.json");
        if let Ok(c) = tokio::fs::read_to_string(path).await {
            return json_response(c);
        }
    }
    json_response("{}".to_string())
}

async fn playlist_txt_handler(State(cache): State<SharedCache>) -> impl IntoResponse {
    let content = cache.read().await.playlist_txt.clone();
    text_response(content)
}

async fn playlist_m3u_handler(State(cache): State<SharedCache>) -> impl IntoResponse {
    let content = cache.read().await.playlist_txt.clone();
    m3u_response(content)
}

pub async fn set_resource_dir(path: String) {
    CACHE.write().await.resource_dir = path;
}

fn mime_from_path(path: &str) -> &'static str {
    match path.rsplit('.').next().unwrap_or("").to_lowercase().as_str() {
        "json" => "application/json; charset=utf-8",
        "js"   => "application/javascript; charset=utf-8",
        "jar"  => "application/java-archive",
        "py"   => "text/plain; charset=utf-8",
        "png"  => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "txt"  => "text/plain; charset=utf-8",
        "m3u" | "m3u8" => "application/x-mpegURL",
        _      => "application/octet-stream",
    }
}

async fn file_handler(
    State(cache): State<SharedCache>,
    Path(path): Path<String>,
) -> impl IntoResponse {
    let root = cache.read().await.resource_dir.clone();
    let requested = std::path::Path::new(&path);
    if requested.components().any(|component| matches!(component, std::path::Component::ParentDir)) {
        return error_response(axum::http::StatusCode::BAD_REQUEST, "invalid path");
    }
    let full_path = std::path::Path::new(&root).join(requested);
    match tokio::fs::read(&full_path).await {
        Ok(bytes) => {
            let ct = mime_from_path(&path);
            let mut response = Response::new(bytes.into());
            response.headers_mut().insert(header::CONTENT_TYPE, HeaderValue::from_static(ct));
            response.headers_mut().insert(header::ACCESS_CONTROL_ALLOW_ORIGIN, HeaderValue::from_static("*"));
            response
        }
        Err(_) => error_response(axum::http::StatusCode::NOT_FOUND, "not found"),
    }
}

async fn fallback_handler(
    State(cache): State<SharedCache>,
    axum::extract::OriginalUri(uri): axum::extract::OriginalUri,
) -> impl IntoResponse {
    let path = uri.path().trim_start_matches('/');
    let root = cache.read().await.resource_dir.clone();
    if root.is_empty() {
        return error_response(axum::http::StatusCode::NOT_FOUND, "not found");
    }
    let requested = std::path::Path::new(&path);
    if requested.components().any(|component| matches!(component, std::path::Component::ParentDir)) {
        return error_response(axum::http::StatusCode::BAD_REQUEST, "invalid path");
    }
    let full_path = std::path::Path::new(&root).join(requested);
    match tokio::fs::read(&full_path).await {
        Ok(bytes) => {
            let ct = mime_from_path(path);
            let mut response = Response::new(bytes.into());
            response.headers_mut().insert(header::CONTENT_TYPE, HeaderValue::from_static(ct));
            response.headers_mut().insert(header::ACCESS_CONTROL_ALLOW_ORIGIN, HeaderValue::from_static("*"));
            response
        }
        Err(_) => error_response(axum::http::StatusCode::NOT_FOUND, "not found"),
    }
}

fn error_response(status: axum::http::StatusCode, body: &'static str) -> Response {
    let mut response = Response::new(body.into());
    *response.status_mut() = status;
    response
}

fn json_response(body: String) -> Response {
    let mut r = Response::new(body.into());
    r.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json; charset=utf-8"),
    );
    r.headers_mut().insert(
        header::ACCESS_CONTROL_ALLOW_ORIGIN,
        HeaderValue::from_static("*"),
    );
    r
}

fn text_response(body: String) -> Response {
    let mut r = Response::new(body.into());
    r.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/plain; charset=utf-8"),
    );
    r.headers_mut().insert(
        header::ACCESS_CONTROL_ALLOW_ORIGIN,
        HeaderValue::from_static("*"),
    );
    r
}

fn m3u_response(body: String) -> Response {
    let mut r = Response::new(body.into());
    r.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/x-mpegURL; charset=utf-8"),
    );
    r.headers_mut().insert(
        header::ACCESS_CONTROL_ALLOW_ORIGIN,
        HeaderValue::from_static("*"),
    );
    r
}

fn html_response(body: &'static str) -> Response {
    let mut r = Response::new(body.into());
    r.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/html; charset=utf-8"),
    );
    r
}
