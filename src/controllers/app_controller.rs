use std::sync::Arc;

use crate::config::AppContext;

pub type SharedState = Arc<AppContext>;
pub type Router = axum::Router<SharedState>;

pub trait Controller {
    fn route(state: SharedState) -> Router;
}
