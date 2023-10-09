use axum::{
    extract::{FromRef, Query, State, TypedHeader, FromRequestParts},
    headers::authorization::{Authorization, Basic},
    http::{request::Parts, HeaderMap, Request, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    async_trait
};
use std::sync::Arc;
use tower_sessions::Session;
use serde::{Deserialize, Serialize};

use crate::controllers::app_controller::{Router, SharedState};
use crate::models::users::User;

#[derive(Deserialize, Debug)]
pub struct SwitchUserQuery {
    su: String
}

pub const USER_CONTEXT_KEY: &str = "ukey";

#[derive(Deserialize, Serialize, Debug)]
pub struct UserContext {
    pub user: String,
    pub su: String,
    pub su_data_path_app: String,
    pub su_data_dir_app: String,
    pub root: bool
}

#[derive(Deserialize, Serialize)]
pub struct UserContextWithUserExtractor(pub UserContext, pub User);

#[async_trait]
impl<S> FromRequestParts<S> for UserContextWithUserExtractor
where
    SharedState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(req: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let session = Session::from_request_parts(req, state).await?;
        let state = Arc::from_ref(state);

        if let Ok(Some((ucontext, su))) = User::su_from_session(&state, &session).await {
            Ok(UserContextWithUserExtractor(ucontext, su))
        } else {
            Err((StatusCode::UNAUTHORIZED, "User session no longer valid."))
        }
    }
}

#[derive(Deserialize, Serialize)]
pub struct UserContextExtractor(pub UserContext);

#[async_trait]
impl<S> FromRequestParts<S> for UserContextExtractor
where
    SharedState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(req: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let session = Session::from_request_parts(req, state).await?;

        if let Ok(Some(ucontext)) = session.get::<UserContext>(USER_CONTEXT_KEY) {
            Ok(UserContextExtractor(ucontext))
        } else {
            Err((StatusCode::UNAUTHORIZED, "User session no longer valid."))
        }
    }
}

#[inline]
pub fn unauthorized_realm(realm: &str) -> Response {
let mut headers = HeaderMap::new();
    headers.insert(
        "WWW-Authenticate",
        format!("Basic realm=\"{realm}\"").parse().unwrap()
    );
    (
        StatusCode::UNAUTHORIZED,
        headers,
        "Unauthorized"
    ).into_response()
}

#[inline]
pub fn unauthorized() -> Response {
    // let's not make people type in their passwords again
    // just because we moved to rust
    unauthorized_realm("Restricted Area")
}

#[inline(always)]
pub async fn client_area<B>(
    State(state): State<SharedState>,
    auth: Option<TypedHeader<Authorization<Basic>>>,
    session: Session,
    su_query: Option<Query<SwitchUserQuery>>,
    request: Request<B>,
    next: Next<B>,
) -> Response {
    if let Some(TypedHeader(auth)) = auth {
        let uname = auth.username();
        let pwd = auth.password();

        if let Ok(Some(ucontext)) = session.get::<UserContext>(USER_CONTEXT_KEY) {
            // already logged in
            if let Some(Query(su)) = &su_query {
                // su hasn't changed
                if ucontext.user == uname && su.su == ucontext.su {
                    return next.run(request).await;
                }
            } else if ucontext.user == uname && ucontext.su == uname {
                // no su param and no su in ucontext
                // (if there's no su but ucontext.su is switched, then we need
                // to revalidate, basically sending admin back to admin's own
                // account)
                return next.run(request).await;
            }
        }

        match User::authenticate(&state, uname, pwd).await {
            Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error.").into_response(),
            Ok(None) => unauthorized(),
            Ok(Some(user)) => {
                let mut ucontext = UserContext {
                    user: user.username.clone(),
                    su: user.username.clone(),
                    su_data_path_app: user.data_path_app(&state),
                    su_data_dir_app: user.data_dir_app(&state),
                    root: user.is_root(),
                };

                if let Some(Query(su)) = su_query {
                    if !user.is_root() {
                        return unauthorized();
                    }

                    match User::get_by_uname(&state, &su.su).await {
                        // db error
                        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error.").into_response(),
                        // user not found
                        Ok(None) => return unauthorized(),
                        Ok(Some(su_user)) => {
                            ucontext.su_data_path_app = su_user.data_path_app(&state);
                            ucontext.su_data_dir_app = su_user.data_dir_app(&state);
                            ucontext.su = su_user.username;
                        }
                    }
                }

                session.insert(USER_CONTEXT_KEY, ucontext)
                    .expect("Could not serialize ucontext.");

                next.run(request).await
            }
        }
    } else {
        unauthorized()
    }

}

pub fn wrap_router(router: Router, state: SharedState) -> Router {
    router.route_layer(
        middleware::from_fn_with_state(state, client_area)
    )
}

