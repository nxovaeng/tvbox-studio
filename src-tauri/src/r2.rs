use anyhow::Result;
use aws_sdk_s3::{
    config::{Credentials, Region},
    primitives::ByteStream,
    Client,
};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct R2Config {
    pub account_id: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    pub bucket_name: String,
    pub public_domain: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct UploadResult {
    pub success: bool,
    pub url: Option<String>,
    pub key: String,
    pub message: Option<String>,
}

/// 创建 R2 S3 客户端
fn build_client(cfg: &R2Config) -> Client {
    let creds = Credentials::new(
        &cfg.access_key_id,
        &cfg.secret_access_key,
        None,
        None,
        "tvbox-studio",
    );
    let endpoint = format!("https://{}.r2.cloudflarestorage.com", cfg.account_id);
    let s3_cfg = aws_sdk_s3::Config::builder()
        .credentials_provider(creds)
        .region(Region::new("auto"))
        .endpoint_url(endpoint)
        .force_path_style(true)
        .build();
    Client::from_conf(s3_cfg)
}

/// 上传单个文件内容（字节）到 R2
pub async fn upload_bytes(cfg: &R2Config, key: &str, data: Vec<u8>, content_type: &str) -> Result<UploadResult> {
    let client = build_client(cfg);
    let stream = ByteStream::from(data);

    let result = client
        .put_object()
        .bucket(&cfg.bucket_name)
        .key(key)
        .content_type(content_type)
        .body(stream)
        .send()
        .await;

    match result {
        Ok(_) => {
            let url = build_public_url(cfg, key);
            Ok(UploadResult { success: true, url: Some(url), key: key.to_string(), message: None })
        }
        Err(e) => Ok(UploadResult {
            success: false,
            url: None,
            key: key.to_string(),
            message: Some(e.to_string()),
        }),
    }
}

/// 上传文本内容（UTF-8）到 R2
pub async fn upload_text(cfg: &R2Config, key: &str, text: &str, content_type: &str) -> Result<UploadResult> {
    upload_bytes(cfg, key, text.as_bytes().to_vec(), content_type).await
}

/// 列出 Bucket 中的文件
pub async fn list_objects(cfg: &R2Config, prefix: Option<&str>) -> Result<Vec<String>> {
    let client = build_client(cfg);
    let mut req = client.list_objects_v2().bucket(&cfg.bucket_name);
    if let Some(p) = prefix {
        req = req.prefix(p);
    }
    let resp = req.send().await?;
    let keys = resp
        .contents()
        .iter()
        .filter_map(|o| o.key().map(String::from))
        .collect();
    Ok(keys)
}

/// 删除单个对象
pub async fn delete_object(cfg: &R2Config, key: &str) -> Result<bool> {
    let client = build_client(cfg);
    client.delete_object().bucket(&cfg.bucket_name).key(key).send().await?;
    Ok(true)
}

fn build_public_url(cfg: &R2Config, key: &str) -> String {
    if let Some(domain) = &cfg.public_domain {
        let domain = domain.trim_end_matches('/');
        format!("{}/{}", domain, key)
    } else {
        // R2 公开访问 URL 格式 (需要在 R2 Dashboard 开启公开访问)
        format!(
            "https://pub-{}.r2.dev/{}",
            cfg.account_id, key
        )
    }
}

/// 批量上传（返回每个文件的结果）
pub async fn upload_batch(
    cfg: &R2Config,
    files: Vec<(String, Vec<u8>, String)>, // (key, data, content_type)
) -> Vec<UploadResult> {
    let mut results = vec![];
    for (key, data, ct) in files {
        let r = upload_bytes(cfg, &key, data, &ct).await
            .unwrap_or_else(|e| UploadResult {
                success: false,
                url: None,
                key: key.clone(),
                message: Some(e.to_string()),
            });
        results.push(r);
    }
    results
}

/// 测试 R2 配置是否有效（尝试列出对象）
pub async fn test_connection(cfg: &R2Config) -> Result<bool> {
    let client = build_client(cfg);
    client
        .list_buckets()
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("R2 连接失败: {}", e))?;
    Ok(true)
}
