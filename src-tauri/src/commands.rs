use tauri::{Runtime, Window};
use crate::{
    tvbox::{
        check::{check_connections, check_urls, ConnectionStatus},
        source::{vod::Vod, live::Live, parse::Parse, Source},
    },
    utils,
    r2,
    server,
};

// ============================================================
// TVBox 配置解析
// ============================================================

#[tauri::command]
pub async fn parse_tvbox(uri: String) -> Result<serde_json::Value, String> {
    let content = utils::read_content(&uri).await.map_err(|e| e.to_string())?;
    let mut source = Source::parse(&content).map_err(|e| e.to_string())?;
    if uri.starts_with("http://") || uri.starts_with("https://") {
        source.resolve_base(&uri);
    }
    serde_json::to_value(source).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_content(uri: String) -> Result<String, String> {
    utils::read_content(&uri).await.map_err(|e| e.to_string())
}

// ============================================================
// 连通性检测
// ============================================================

#[tauri::command]
pub async fn check_vods<R: Runtime>(
    window: Window<R>,
    items: Vec<Vod>,
    quick_mode: Option<bool>,
    skip_ipv6: Option<bool>,
) -> Vec<ConnectionStatus<Vod>> {
    check_connections(window, items, quick_mode.unwrap_or(false), skip_ipv6.unwrap_or(false)).await
}

#[tauri::command]
pub async fn check_lives<R: Runtime>(
    window: Window<R>,
    items: Vec<Live>,
    quick_mode: Option<bool>,
    skip_ipv6: Option<bool>,
) -> Vec<ConnectionStatus<Live>> {
    check_connections(window, items, quick_mode.unwrap_or(false), skip_ipv6.unwrap_or(false)).await
}

#[tauri::command]
pub async fn check_parses<R: Runtime>(
    window: Window<R>,
    items: Vec<Parse>,
    quick_mode: Option<bool>,
    skip_ipv6: Option<bool>,
) -> Vec<ConnectionStatus<Parse>> {
    check_connections(window, items, quick_mode.unwrap_or(false), skip_ipv6.unwrap_or(false)).await
}

#[tauri::command]
pub async fn check_url_list<R: Runtime>(
    window: Window<R>,
    urls: Vec<String>,
    quick_mode: Option<bool>,
    skip_ipv6: Option<bool>,
    check_m3u8: Option<bool>,
) -> Vec<String> {
    check_urls(
        window,
        urls,
        quick_mode.unwrap_or(false),
        skip_ipv6.unwrap_or(false),
        check_m3u8.unwrap_or(false),
    )
    .await
}

// ============================================================
// 文件操作
// ============================================================

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<bool, String> {
    // 确保父目录存在
    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, &content).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn write_file_bytes(path: String, data: Vec<u8>) -> Result<bool, String> {
    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, &data).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn delete_file(path: String) -> Result<bool, String> {
    std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn create_dir(path: String) -> Result<bool, String> {
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn list_dir(path: String) -> Result<Vec<FileEntry>, String> {
    let entries = std::fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut result = vec![];
    for entry in entries.flatten() {
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        result.push(FileEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_dir: meta.is_dir(),
            size: if meta.is_file() { Some(meta.len()) } else { None },
            modified: meta.modified().ok().and_then(|t| {
                t.duration_since(std::time::UNIX_EPOCH).ok().map(|d| d.as_secs())
            }),
        });
    }
    result.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir).then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(result)
}

#[derive(serde::Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: Option<u64>,
    pub modified: Option<u64>,
}

// ============================================================
// 资源下载（用于本地化）
// ============================================================

#[tauri::command]
pub async fn download_file(url: String, save_path: String) -> Result<bool, String> {
    let data = utils::download_bytes(&url).await.map_err(|e| e.to_string())?;
    if let Some(parent) = std::path::Path::new(&save_path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&save_path, &data).map_err(|e| e.to_string())?;
    Ok(true)
}

// ============================================================
// 内嵌 HTTP Server 控制
// ============================================================

#[tauri::command]
pub async fn server_cache(key: String, value: String) {
    server::update_cache(&key, value).await;
}

#[tauri::command]
pub async fn server_get_cache(key: String) -> String {
    server::get_cache(&key).await
}

#[tauri::command]
pub fn get_lan_ips() -> Vec<String> {
    utils::lan_ips()
}

#[tauri::command]
pub fn is_app_installed(app: String) -> bool {
    utils::is_installed(&app)
}

// ============================================================
// Cloudflare R2 上传
// ============================================================

#[derive(serde::Deserialize)]
pub struct R2ConfigDto {
    pub account_id: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    pub bucket_name: String,
    pub public_domain: Option<String>,
}

impl From<R2ConfigDto> for r2::R2Config {
    fn from(dto: R2ConfigDto) -> Self {
        r2::R2Config {
            account_id: dto.account_id,
            access_key_id: dto.access_key_id,
            secret_access_key: dto.secret_access_key,
            bucket_name: dto.bucket_name,
            public_domain: dto.public_domain,
        }
    }
}

#[tauri::command]
pub async fn r2_test(config: R2ConfigDto) -> Result<bool, String> {
    let cfg: r2::R2Config = config.into();
    r2::test_connection(&cfg).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn r2_upload_text(
    config: R2ConfigDto,
    key: String,
    content: String,
    content_type: String,
) -> Result<r2::UploadResult, String> {
    let cfg: r2::R2Config = config.into();
    r2::upload_text(&cfg, &key, &content, &content_type)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn r2_upload_file(
    config: R2ConfigDto,
    key: String,
    file_path: String,
) -> Result<r2::UploadResult, String> {
    let cfg: r2::R2Config = config.into();
    let data = std::fs::read(&file_path).map_err(|e| e.to_string())?;
    let ct = mime_from_path(&file_path);
    r2::upload_bytes(&cfg, &key, data, ct)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn r2_list(config: R2ConfigDto, prefix: Option<String>) -> Result<Vec<String>, String> {
    let cfg: r2::R2Config = config.into();
    r2::list_objects(&cfg, prefix.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn r2_delete(config: R2ConfigDto, key: String) -> Result<bool, String> {
    let cfg: r2::R2Config = config.into();
    r2::delete_object(&cfg, &key)
        .await
        .map_err(|e| e.to_string())
}

fn mime_from_path(path: &str) -> &'static str {
    match path.rsplit('.').next().unwrap_or("").to_lowercase().as_str() {
        "json" => "application/json; charset=utf-8",
        "js"   => "application/javascript; charset=utf-8",
        "jar"  => "application/java-archive",
        "png"  => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "txt"  => "text/plain; charset=utf-8",
        "m3u" | "m3u8" => "application/x-mpegURL",
        _      => "application/octet-stream",
    }
}

// ============================================================
// 工具：哈希计算
// ============================================================

#[tauri::command]
pub fn hash_content(content: String) -> String {
    let v = xxhash_rust::xxh3::xxh3_64_with_seed(content.as_bytes(), 42);
    format!("{:0>16X}", v)
}

// ============================================================
// TVBox 设备推送
// ============================================================

#[derive(serde::Serialize)]
pub struct PushResult {
    pub success: bool,
    pub message: String,
}

#[tauri::command]
pub async fn push_to_tvbox(tvbox_url: String, config_url: String) -> PushResult {
    // 尝试 TVBox/影视仓 推送接口
    let endpoints = vec![
        format!("{}/api/v1/config/set?url={}", tvbox_url.trim_end_matches('/'), urlencoding::encode(&config_url)),
        format!("{}/pushConfig?url={}", tvbox_url.trim_end_matches('/'), urlencoding::encode(&config_url)),
    ];

    for endpoint in endpoints {
        if let Ok(resp) = reqwest::get(&endpoint).await {
            if resp.status().is_success() {
                return PushResult { success: true, message: "推送成功".to_string() };
            }
        }
    }
    PushResult { success: false, message: "推送失败，请确认设备地址和端口".to_string() }
}
