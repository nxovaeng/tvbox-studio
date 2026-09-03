#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct IjkOption {
    pub category: i32,
    pub name: String,
    pub value: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Ijk {
    pub group: String,
    pub options: Vec<IjkOption>,
}
