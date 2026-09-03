use std::sync::Arc;
use super::Connection;
use tauri::{Emitter, Runtime, Window};
use tokio::sync::Mutex;

#[derive(Clone, serde::Serialize)]
pub struct ProgressPayload {
    pub progress: u64,
    pub total: u64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ConnectionStatus<T> {
    pub connectable: bool,
    pub extra: T,
}

/// 并发批量检测连通性，通过 Tauri 事件发送进度
pub async fn check_connections<T, R>(
    window: Window<R>,
    links: Vec<T>,
    quick_mode: bool,
    skip_ipv6: bool,
) -> Vec<ConnectionStatus<T>>
where
    T: Connection + Clone + Send + Sync + 'static,
    R: Runtime,
{
    if links.is_empty() {
        return vec![];
    }

    let total = links.len() as u64;
    let count = Arc::new(Mutex::new(0u64));

    // 计算合理线程数
    let threads = {
        let n = num_cpus::get().max(1);
        if links.len() > n * n { n } else { (links.len() / n).max(1) }
    };
    let chunk_size = (links.len() / threads).max(1);

    let _ = window.emit("check://progress", ProgressPayload { progress: 0, total });

    let mut tasks = vec![];
    for chunk in links.chunks(chunk_size) {
        let chunk = chunk.to_vec();
        let w = window.clone();
        let cnt = count.clone();
        let t = tokio::spawn(async move {
            let mut results = vec![];
            for mut item in chunk {
                let ok = item.check(quick_mode, skip_ipv6).await.unwrap_or(false);
                results.push(ConnectionStatus { connectable: ok, extra: item });
                let mut c = cnt.lock().await;
                *c += 1;
                let _ = w.emit("check://progress", ProgressPayload { progress: *c, total });
            }
            results
        });
        tasks.push(t);
    }

    let mut all = vec![];
    for t in tasks {
        if let Ok(mut v) = t.await {
            all.append(&mut v);
        }
    }
    all
}

/// 批量 URL 连通性检测（纯 URL 字符串）
pub async fn check_urls<R: Runtime>(
    window: Window<R>,
    urls: Vec<String>,
    quick_mode: bool,
    skip_ipv6: bool,
    check_m3u8: bool,
) -> Vec<String> {
    if urls.is_empty() { return vec![]; }
    let total = urls.len() as u64;
    let count = Arc::new(Mutex::new(0u64));

    let threads = {
        let n = num_cpus::get().max(1);
        if urls.len() > n * n { n } else { (urls.len() / n).max(1) }
    };
    let chunk_size = (urls.len() / threads).max(1);

    let _ = window.emit("check://progress", ProgressPayload { progress: 0, total });

    let mut tasks = vec![];
    for chunk in urls.chunks(chunk_size) {
        let chunk = chunk.to_vec();
        let w = window.clone();
        let cnt = count.clone();
        let t = tokio::spawn(async move {
            let mut alive = vec![];
            for url in chunk {
                if url::Url::parse(&url).is_err() { continue; }
                if skip_ipv6 && url.contains("://[") { continue; }
                let ok = if quick_mode {
                    crate::utils::url_connectivity(&url).await.unwrap_or(false)
                } else if check_m3u8 {
                    crate::utils::url_m3u8_accessibility(&url).await.unwrap_or(false)
                } else {
                    crate::utils::url_accessibility(&url).await.unwrap_or(false)
                };
                if ok { alive.push(url); }
                let mut c = cnt.lock().await;
                *c += 1;
                let _ = w.emit("check://progress", ProgressPayload { progress: *c, total });
            }
            alive
        });
        tasks.push(t);
    }

    let mut result = vec![];
    for t in tasks { if let Ok(mut v) = t.await { result.append(&mut v); } }
    result
}
