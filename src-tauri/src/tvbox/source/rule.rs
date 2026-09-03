#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Rule {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub host: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hosts: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub regex: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rule: Option<Vec<String>>,
}
