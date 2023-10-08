use super::app_controller::*;
use axum::response::Redirect;
use axum::routing::get;
use tower_http::services::ServeDir;

const REDIRECT_URL: &str = "https://docs.google.com/forms/d/e/1FAIpQLSczc8NBAMxY-9PZbda7xmbfMyiSVn6H3UEaBHoq_7BEegP9kw/viewform";

pub struct IndexController;

impl Controller for IndexController {
    fn route(state: SharedState) -> Router {
        let app_root = state.app_root.clone();

        Router::new()
            .route("/", get(Self::index))
            .route("/register", get(Self::index))
            .route("/client", get(Self::to_client))
            .fallback_service(ServeDir::new(format!("{app_root}/public")))
    }
}

impl IndexController {
    async fn index() -> Redirect {
        Redirect::temporary(REDIRECT_URL)
    }

    async fn to_client() -> Redirect {
        Redirect::to("/client/")
    }
}
