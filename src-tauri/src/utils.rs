use anyhow::Result;
use std::time::Duration;
use url::Url;

/// 检测 TCP 连通性（快速模式，0.8s 超时）
pub async fn url_connectivity(uri: &str) -> Result<bool> {
    use std::net::ToSocketAddrs;
    let uri = Url::parse(uri)?;
    let host = uri.host().ok_or_else(|| anyhow::anyhow!("无效主机"))?.to_string();
    let port = uri.port().unwrap_or_else(|| if uri.scheme() == "https" { 443 } else { 80 });
    let addr_str = format!("{}:{}", host, port);
    let addr = tokio::task::spawn_blocking(move || {
        addr_str.to_socket_addrs()?.next().ok_or_else(|| anyhow::anyhow!("DNS解析失败"))
    })
    .await??;
    tokio::time::timeout(
        Duration::from_millis(800),
        tokio::net::TcpStream::connect(addr),
    )
    .await??;
    Ok(true)
}

/// HTTP 可达性检测（完整模式，10s 超时）
pub async fn url_accessibility(uri: &str) -> Result<bool> {
    url_connectivity(uri).await?;
    let client = reqwest::ClientBuilder::new()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .connect_timeout(Duration::from_secs(6))
        .timeout(Duration::from_secs(10))
        .danger_accept_invalid_certs(true)
        .build()?;
    let resp = client.get(uri).send().await?;
    Ok(resp.status().is_success())
}

/// 检测直播 M3U8 地址可达性
pub async fn url_m3u8_accessibility(uri: &str) -> Result<bool> {
    url_connectivity(uri).await?;
    let client = reqwest::ClientBuilder::new()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .connect_timeout(Duration::from_secs(6))
        .timeout(Duration::from_secs(10))
        .danger_accept_invalid_certs(true)
        .build()?;
    let resp = client.get(uri).send().await?;
    if resp.status().is_success() {
        let path = Url::parse(uri).map(|u| u.path().to_string()).unwrap_or_default();
        let not_m3u8 = path.ends_with(".mp4") || path.ends_with(".flv") || path.ends_with(".mkv");
        if not_m3u8 {
            return Ok(true);
        }
        let content_type = resp
            .headers()
            .get(reqwest::header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_string();
        if content_type.contains("mpegURL") || content_type.contains("m3u") {
            let body = resp.text().await.unwrap_or_default();
            return Ok(m3u8_rs::parse_playlist(body.as_bytes()).is_ok());
        }
    }
    Ok(false)
}

/// 读取 URI 内容（支持 http(s) 和本地路径）
pub async fn read_content(uri: &str) -> Result<String> {
    if uri.starts_with("http://") || uri.starts_with("https://") {
        let client = reqwest::ClientBuilder::new()
            .user_agent("okhttp/3.15")
            .timeout(Duration::from_secs(15))
            .danger_accept_invalid_certs(true)
            .build()?;
        let text = client.get(uri).send().await?.text().await?;
        Ok(text)
    } else if std::path::Path::new(uri).exists() {
        Ok(std::fs::read_to_string(uri)?)
    } else {
        Err(anyhow::anyhow!("无效资源: {}", uri))
    }
}

/// 下载二进制文件
pub async fn download_bytes(uri: &str) -> Result<Vec<u8>> {
    let client = reqwest::ClientBuilder::new()
        .user_agent("okhttp/3.15")
        .timeout(Duration::from_secs(30))
        .danger_accept_invalid_certs(true)
        .build()?;
    let bytes = client.get(uri).send().await?.bytes().await?;
    Ok(bytes.to_vec())
}

/// 获取本地局域网 IP 列表
pub fn lan_ips() -> Vec<String> {
    default_net::get_default_interface()
        .ok()
        .map(|i| i.ipv4.into_iter().map(|ip| ip.addr.to_string()).collect())
        .unwrap_or_default()
}

/// 检查应用是否已安装（在 PATH 中）
pub fn is_installed(app: &str) -> bool {
    if let Some(path_var) = std::env::var_os("PATH") {
        let sep = if cfg!(windows) { ";" } else { ":" };
        path_var
            .into_string()
            .unwrap_or_default()
            .split(sep)
            .any(|p| {
                let exe = if cfg!(windows) {
                    format!("{}.exe", app)
                } else {
                    app.to_string()
                };
                std::path::Path::new(p).join(&exe).exists()
            })
    } else {
        false
    }
}

pub fn is_http_url(s: &str) -> bool {
    s.to_lowercase().starts_with("http://") || s.to_lowercase().starts_with("https://")
}
