mod commons;
mod config;

mod helpers;
mod middleware;
mod controllers;

mod models;

mod db;
mod schema;

mod cron;

use controllers::app_controller::Controller;
use controllers::index_controller::IndexController;
use controllers::client_controller::ClientController;
use controllers::admin_controller::AdminController;
use middleware::charset::append_charset_utf8;
use cron::backup::cron_backup_res;
use config::AppContext;

use std::sync::Arc;

use clap::Parser;

use axum::{
    error_handling::HandleErrorLayer,
    BoxError,
    Router,
    http::StatusCode
};

use tower::ServiceBuilder;
use tower_http::trace::TraceLayer;
use tower_sessions::{SessionManagerLayer, MokaStore};

use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use tokio_cron_scheduler::{JobScheduler, Job};

#[derive(Parser, Debug)]
struct Args {
    /// Path to .env file
    #[arg(short, long, default_value="production.env")]
    config: String,
}

#[tokio::main(flavor = "multi_thread")] // defaults to number of cpus
async fn main() {
    let args = Args::parse();
    let context = AppContext::init(&args.config);

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

    // cron jobs:
    let sched = JobScheduler::new().await.unwrap();

    let _ = cron_backup_res(&shared_state);

    let app = app.with_state(shared_state.clone());

    // 7 AM UTC = 2 AM CT
    sched.add(Job::new("0 0 7 * * *", move |_, _| {
        let _ =cron_backup_res(&shared_state);
    }).unwrap()).await.unwrap();

    sched.start().await.unwrap();

    axum::Server::bind(&bind.parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}
