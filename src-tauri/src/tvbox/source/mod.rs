use anyhow::Result;
pub mod vod;
pub mod live;
pub mod parse;
pub mod rule;
pub mod ijk;

pub use vod::Vod;
pub use live::Live;
pub use parse::Parse;
pub use rule::Rule;
pub use ijk::Ijk;

/// TVBox 完整配置结构
#[derive(Debug, Default, Clone, serde::Serialize, serde::Deserialize)]
pub struct Source {
    pub sites: Vec<Vod>,
    pub lives: Vec<Live>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parses: Option<Vec<Parse>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub flags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ijk: Option<Vec<Ijk>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rules: Option<Vec<Rule>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ads: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wallpaper: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spider: Option<String>,
    #[serde(rename = "warningText", skip_serializing_if = "Option::is_none")]
    pub warning_text: Option<String>,
}

impl Source {
    /// 解析 TVBox JSON（支持 # 和 // 注释，宽松 JSON）
    pub fn parse(content: &str) -> Result<Self> {
        // 移除 # 行注释
        let re_hash = regex::Regex::new(r"(?m)^#.*$").unwrap();
        let s = re_hash.replace_all(content, "");
        // json5 宽松解析
        if let Ok(doc) = json5::from_str::<Self>(&s) {
            return Ok(doc);
        }
        // 移除 // 注释后再试
        let re_slash = regex::Regex::new(r"//[^\n]*").unwrap();
        let s2 = re_slash.replace_all(&s, "");
        let doc = serde_json::from_str::<Self>(&s2)
            .map_err(|e| anyhow::anyhow!("解析失败: {}", e))?;
        Ok(doc)
    }

    /// 将相对路径转为绝对路径（基于 base URL）
    pub fn resolve_base(&mut self, base: &str) {
        self.sites.iter_mut().for_each(|s| s.resolve_base(base));
        self.lives.iter_mut().for_each(|l| l.resolve_base(base));
        if let Some(spider) = &self.spider {
            if spider.starts_with('.') || spider.starts_with('/') {
                if let Ok(base_url) = url::Url::parse(base) {
                    if let Ok(abs) = base_url.join(spider) {
                        self.spider = Some(abs.to_string());
                    }
                }
            }
        }
    }
}

pub fn resolve_url(base: &str, path: &str) -> String {
    if path.starts_with('.') || path.starts_with('/') {
        if let Ok(base_url) = url::Url::parse(base) {
            if let Ok(abs) = base_url.join(path) {
                return abs.to_string();
            }
        }
    }
    path.to_string()
}
