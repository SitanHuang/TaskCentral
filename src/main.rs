mod commons;
mod config;

mod helpers;
mod middleware;
mod controllers;

mod models;

mod db;
mod schema;

use controllers::app_controller::Controller;
use controllers::index_controller::IndexController;
use controllers::client_controller::ClientController;
use controllers::admin_controller::AdminController;
use middleware::charset::append_charset_utf8;
use config::AppContext;

use std::sync::Arc;

use axum::{
    error_handling::HandleErrorLayer,
    BoxError,
    Router,
    http::StatusCode
};


use tower::ServiceBuilder;
use tower_sessions::{SessionManagerLayer, MokaStore};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use tower_http::trace::TraceLayer;

#[tokio::main(flavor = "multi_thread")] // defaults to number of cpus
async fn main() {
    let context = AppContext::init();

    let bind = context.get_bind();
    let session_store_size = context.get_session_store_size();

    let shared_state = Arc::new(context);

    let session_store = MokaStore::new(Some(session_store_size));
    let session_service = ServiceBuilder::new()
        .layer(HandleErrorLayer::new(|_: BoxError| async {
            StatusCode::BAD_REQUEST
        }))
        .layer(
            SessionManagerLayer::new(session_store)
                .with_secure(false),
                // .with_max_age(Duration::minutes(30)),
        );

    let mut app: Router<_> = IndexController::route(shared_state.clone())
        .nest("/client/", ClientController::route(shared_state.clone()))
        .nest("/admin/", AdminController::route(shared_state.clone()))
        .layer(session_service)
        .layer(axum::middleware::from_fn(append_charset_utf8));

    if std::env::var("DEBUG").is_ok() {
        tracing_subscriber::registry()
            .with(tracing_subscriber::fmt::layer())
            .init();

        app = app.layer(TraceLayer::new_for_http());
    }

    let app = app.with_state(shared_state);

    axum::Server::bind(&bind.parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}
