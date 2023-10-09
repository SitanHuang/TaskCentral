use axum::{
    http::Request,
    middleware::{self, Next},
    response::Response
};
use crate::controllers::app_controller::{Router, SharedState};
use super::client_area::*;

pub async fn admin_area<B>(
    UserContextExtractor(ucontext): UserContextExtractor,
    request: Request<B>,
    next: Next<B>,
) -> Response {
    if !ucontext.root { unauthorized() } else { next.run(request).await }
}

pub fn wrap_router(router: Router, state: SharedState) -> Router {
    router.route_layer(
        middleware::from_fn_with_state(state, admin_area)
    )
}


