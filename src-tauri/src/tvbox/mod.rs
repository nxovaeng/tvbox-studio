pub mod check;
pub mod source;

use anyhow::Result;
use async_trait::async_trait;

/// 可连通性 trait，所有需要检测的类型实现它
#[async_trait]
pub trait Connection {
    async fn check(&mut self, quick_mode: bool, skip_ipv6: bool) -> Result<bool>;
}
