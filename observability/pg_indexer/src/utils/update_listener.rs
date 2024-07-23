use anyhow::Result;
use futures::stream::StreamExt;
use std::sync::Arc;
use tracing::{error, info};
use yellowstone_grpc_client::GeyserGrpcClient;
use yellowstone_grpc_proto::geyser::{subscribe_update::UpdateOneof, SubscribeRequest};

#[derive(Clone)]
pub struct ListenerConfig {
    pub endpoint: String,
    pub token: Option<String>,
    pub subscribe_request: SubscribeRequest,
}

impl Default for ListenerConfig {
    fn default() -> Self {
        Self {
            endpoint: "".to_string(),
            token: None,
            subscribe_request: SubscribeRequest::default(),
        }
    }
}

pub async fn listen_to_updates<F, T, Fut>(
    listener_config: ListenerConfig,
    process_update: F,
    buffers: Arc<T>,
) -> Result<()>
where
    F: Fn(UpdateOneof, Arc<T>) -> Fut + Send + Sync + 'static,
    Fut: std::future::Future<Output = ()> + Send + 'static,
{
    loop {
        let mut client = GeyserGrpcClient::build_from_shared(listener_config.endpoint.clone())?
            .x_token(listener_config.token.clone())?
            .connect()
            .await?;

        let (_, mut stream) = client
            .subscribe_with_request(Some(listener_config.subscribe_request.clone()))
            .await?;

        info!("Connected to geyser!");

        while let Some(Ok(received)) = stream.next().await {
            if let Some(update) = received.update_oneof {
                process_update(update, buffers.clone()).await;
            }
        }

        error!("Connection to geyser lost, reconnecting...");
    }
}
