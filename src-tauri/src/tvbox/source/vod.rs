use super::super::Connection;
use crate::utils;
use anyhow::Result;
use async_trait::async_trait;
use serde_aux::prelude::*;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Vod {
    pub key: String,
    pub name: String,
    #[serde(rename = "type", default, deserialize_with = "deserialize_number_from_string")]
    pub src_type: i32,
    pub api: String,
    #[serde(default, deserialize_with = "deserialize_number_from_string")]
    pub searchable: i32,
    #[serde(rename = "quickSearch", default, deserialize_with = "deserialize_number_from_string")]
    pub quick_search: i32,
    #[serde(default, deserialize_with = "deserialize_option_number_from_string")]
    pub filterable: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ext: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jar: Option<String>,
    #[serde(rename = "playerType", default = "Vod::default_player_type",
            deserialize_with = "deserialize_option_number_from_string")]
    pub player_type: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub categories: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub click: Option<String>,
    #[serde(default = "Vod::default_player_type",
            deserialize_with = "deserialize_option_number_from_string")]
    pub hide: Option<i32>,
}

impl Vod {
    pub fn default_player_type() -> Option<i32> { Some(-1) }

    pub fn resolve_base(&mut self, base: &str) {
        self.api = super::resolve_url(base, &self.api);
        if let Some(serde_json::Value::String(x)) = &mut self.ext {
            *x = super::resolve_url(base, x);
        }
    }
}

#[async_trait]
impl Connection for Vod {
    async fn check(&mut self, quick_mode: bool, skip_ipv6: bool) -> Result<bool> {
        if utils::is_http_url(&self.api) {
            if skip_ipv6 && self.api.contains("://[") { return Ok(false); }
            let ok = if quick_mode {
                utils::url_connectivity(&self.api).await?
            } else {
                utils::url_accessibility(&self.api).await?
            };
            if !ok { return Err(anyhow::anyhow!("API 不可达")); }

            if let Some(serde_json::Value::String(x)) = &self.ext {
                if x.starts_with("http://127.0.0.1") || x.starts_with("http://localhost") {
                    return Ok(true);
                }
                if utils::is_http_url(x) {
                    if skip_ipv6 && x.contains("://[") { return Ok(false); }
                    if x.ends_with(".js") || x.ends_with(".py") {
                        let content = reqwest::get(x).await?.text().await?;
                        let re = regex::Regex::new(r"https?://[0-9A-Za-z.\-]+")?;
                        let host = re.find(&content)
                            .map(|m| m.as_str().to_string())
                            .ok_or_else(|| anyhow::anyhow!("找不到站点主机"))?;
                        let ok = utils::url_connectivity(&host).await.unwrap_or(false);
                        if !ok { return Err(anyhow::anyhow!("站点主机不可达")); }
                    } else {
                        let ok = if quick_mode {
                            utils::url_connectivity(x).await?
                        } else {
                            utils::url_accessibility(x).await?
                        };
                        if !ok { return Err(anyhow::anyhow!("ext 不可达")); }
                    }
                }
            }
        }
        Ok(true)
    }
}
