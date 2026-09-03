use super::super::Connection;
use crate::utils;
use anyhow::Result;
use async_trait::async_trait;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Parse {
    pub name: String,
    #[serde(rename = "type")]
    pub parse_type: i32,
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ext: Option<serde_json::Value>,
}

#[async_trait]
impl Connection for Parse {
    async fn check(&mut self, quick_mode: bool, skip_ipv6: bool) -> Result<bool> {
        if utils::is_http_url(&self.url) {
            if skip_ipv6 && self.url.contains("://[") { return Ok(false); }
            let ok = if quick_mode {
                utils::url_connectivity(&self.url).await?
            } else {
                utils::url_accessibility(&self.url).await?
            };
            return Ok(ok);
        }
        Ok(true)
    }
}
