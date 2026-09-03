use super::super::Connection;
use crate::utils;
use anyhow::Result;
use async_trait::async_trait;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LiveChannel {
    pub name: String,
    pub urls: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Live {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channels: Option<Vec<LiveChannel>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub epg: Option<String>,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub live_type: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

impl Live {
    pub fn resolve_base(&mut self, base: &str) {
        if let Some(url) = &self.url {
            self.url = Some(super::resolve_url(base, url));
        }
    }
}

#[async_trait]
impl Connection for Live {
    async fn check(&mut self, quick_mode: bool, skip_ipv6: bool) -> Result<bool> {
        if let Some(url) = &self.url {
            if utils::is_http_url(url) {
                if skip_ipv6 && url.contains("://[") { return Ok(false); }
                let ok = if quick_mode {
                    utils::url_connectivity(url).await?
                } else {
                    utils::url_m3u8_accessibility(url).await?
                };
                return Ok(ok);
            }
        }
        Ok(true)
    }
}
