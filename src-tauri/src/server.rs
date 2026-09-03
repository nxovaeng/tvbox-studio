use axum::{
    extract::State,
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
}

static CACHE: Lazy<Arc<RwLock<Cache>>> =
    Lazy::new(|| Arc::new(RwLock::new(Cache::default())));

pub async fn update_cache(key: &str, value: String) {
    let mut c = CACHE.write().await;
    match key.to_lowercase().as_str() {
        "tvbox"    => c.tvbox_json = value,
        "playlist" => c.playlist_txt = value,
        _ => {}
    }
}

pub async fn get_cache(key: &str) -> String {
    let c = CACHE.read().await;
    match key.to_lowercase().as_str() {
        "tvbox"    => c.tvbox_json.clone(),
        "playlist" => c.playlist_txt.clone(),
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
    json_response(content)
}

async fn playlist_txt_handler(State(cache): State<SharedCache>) -> impl IntoResponse {
    let content = cache.read().await.playlist_txt.clone();
    text_response(content)
}

async fn playlist_m3u_handler(State(cache): State<SharedCache>) -> impl IntoResponse {
    let content = cache.read().await.playlist_txt.clone();
    m3u_response(content)
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
