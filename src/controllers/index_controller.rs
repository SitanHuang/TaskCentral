use super::app_controller::*;
use axum::{
    extract::State,
    http::StatusCode,
    response::{Html, IntoResponse, Redirect, Response},
    routing::get,
    Form,
};
use bcrypt::hash;
use diesel::prelude::*;
use diesel_async::{AsyncConnection, RunQueryDsl};
use serde::Deserialize;
use tower_http::services::ServeDir;

use crate::{
    commons::timestamp,
    helpers::send_file,
    models::users::{validate_email, validate_signup_password, validate_username, User},
    schema::{signup_limit, users},
};

const SIGNUP_STATUS: i32 = 3;
pub(crate) const SIGNUP_INTERVAL_MILLISECONDS: i64 = 24 * 60 * 60 * 1000;

pub struct IndexController;

#[derive(Deserialize)]
struct RegisterForm {
    username: String,
    password: String,
    email: String,
    purpose: Option<String>,
    affiliation: Option<String>,
    custom_affiliation: Option<String>,
}

#[derive(Debug)]
enum RegistrationError {
    Database(diesel::result::Error),
    Limited,
}

impl From<diesel::result::Error> for RegistrationError {
    fn from(error: diesel::result::Error) -> Self {
        Self::Database(error)
    }
}

impl Controller for IndexController {
    fn route(state: SharedState) -> Router {
        let app_root = state.app_root.clone();

        Router::new()
            .route("/", get(Self::index))
            .route("/register", get(Self::index).post(Self::register))
            .route("/signup-success", get(Self::signup_success))
            .route("/client", get(Self::to_client))
            .route("/admin", get(Self::to_admin))
            .fallback_service(ServeDir::new(format!("{app_root}/public")))
    }
}

impl IndexController {
    async fn index(State(state): State<SharedState>) -> Result<impl IntoResponse, StatusCode> {
        send_file::serve_file(
            &format!("{}/views/index.html", state.app_root),
            "public, must-revalidate, max-age=120",
        )
        .await
    }

    async fn signup_success(
        State(state): State<SharedState>,
    ) -> Result<impl IntoResponse, StatusCode> {
        send_file::serve_file(
            &format!("{}/views/signup-success.html", state.app_root),
            "no-store",
        )
        .await
    }

    async fn register(
        State(state): State<SharedState>,
        Form(form): Form<RegisterForm>,
    ) -> Response {
        let username_value = form.username.trim();
        let email_value = form.email.trim();
        let purpose = form.purpose.as_deref().unwrap_or("").trim();
        let custom_affiliation = form.custom_affiliation.as_deref().unwrap_or("").trim();

        if let Err(message) = validate_username(username_value) {
            return Self::signup_error(StatusCode::BAD_REQUEST, message);
        }
        if let Err(message) = validate_signup_password(&form.password) {
            return Self::signup_error(StatusCode::BAD_REQUEST, message);
        }
        if let Err(message) = validate_email(email_value) {
            return Self::signup_error(StatusCode::BAD_REQUEST, message);
        }
        if purpose.chars().count() > 24 || custom_affiliation.chars().count() > 24 {
            return Self::signup_error(
                StatusCode::BAD_REQUEST,
                "Optional responses cannot exceed 24 characters.",
            );
        }

        let affiliation = match form.affiliation.as_deref() {
            None | Some("") => "Not provided".to_string(),
            Some("vanderbilt") => "Vanderbilt University".to_string(),
            Some("stanford") => "Stanford University".to_string(),
            Some("custom") if !custom_affiliation.is_empty() => custom_affiliation.to_string(),
            Some("custom") => {
                return Self::signup_error(StatusCode::BAD_REQUEST, "Enter a custom affiliation.")
            }
            Some(_) => {
                return Self::signup_error(StatusCode::BAD_REQUEST, "Select a valid affiliation.")
            }
        };

        match User::get_by_uname(&state, username_value).await {
            Ok(Some(_)) => {
                return Self::signup_error(StatusCode::CONFLICT, "That username is already in use.")
            }
            Err(_) => {
                return Self::signup_error(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Account registration is temporarily unavailable.",
                )
            }
            Ok(None) => {}
        }

        let password = match hash(&form.password, 6) {
            Ok(password) => password,
            Err(_) => {
                return Self::signup_error(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Account registration is temporarily unavailable.",
                )
            }
        };
        let now = timestamp() as i64;
        let new_user = User {
            username: username_value.to_string(),
            password,
            create: now,
            status: SIGNUP_STATUS,
            last_visited: Some(0),
            last_updated: Some(0),
            email: Some(email_value.to_string()),
            notes: format!(
                "Use: {}\nAffiliation: {}",
                if purpose.is_empty() {
                    "Not provided"
                } else {
                    purpose
                },
                affiliation,
            ),
        };

        let mut con = match state.db().get().await {
            Ok(con) => con,
            Err(_) => {
                return Self::signup_error(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Account registration is temporarily unavailable.",
                )
            }
        };
        let signup_cap = i32::try_from(state.signup_cap()).unwrap_or(i32::MAX);
        let result = con
            .transaction::<_, RegistrationError, _>(|con| {
                Box::pin(async move {
                    let (window_started, signup_count) = signup_limit::table
                        .find(1)
                        .select((signup_limit::window_started, signup_limit::signup_count))
                        .for_update()
                        .first::<(i64, i32)>(con)
                        .await?;

                    let window_expired =
                        window_started == 0 || window_started <= now - SIGNUP_INTERVAL_MILLISECONDS;
                    let current_count = if window_expired { 0 } else { signup_count };
                    if current_count >= signup_cap {
                        return Err(RegistrationError::Limited);
                    }

                    diesel::update(signup_limit::table.find(1))
                        .set((
                            signup_limit::last_signup.eq(now),
                            signup_limit::window_started.eq(if window_expired {
                                now
                            } else {
                                window_started
                            }),
                            signup_limit::signup_count.eq(current_count + 1),
                        ))
                        .execute(con)
                        .await?;

                    diesel::insert_into(users::table)
                        .values(new_user)
                        .execute(con)
                        .await?;
                    Ok(())
                })
            })
            .await;

        match result {
            Ok(()) => Redirect::to("/signup-success").into_response(),
            Err(RegistrationError::Limited) => Self::signup_error(
                StatusCode::TOO_MANY_REQUESTS,
                "Daily signup capacity has been reached. Please come back later and try again.",
            ),
            Err(RegistrationError::Database(diesel::result::Error::DatabaseError(
                diesel::result::DatabaseErrorKind::UniqueViolation,
                _,
            ))) => Self::signup_error(StatusCode::CONFLICT, "That username is already in use."),
            Err(RegistrationError::Database(_)) => Self::signup_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Account registration is temporarily unavailable.",
            ),
        }
    }

    fn signup_error(status: StatusCode, message: &str) -> Response {
        (
            status,
            Html(format!(
                "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><link rel=\"stylesheet\" href=\"/signup.css\"><title>TaskCentral Account Sign Up</title></head><body><main><h1>TaskCentral Account Sign Up</h1><p class=\"error\">{message}</p><p><a href=\"/\">Return to sign up</a> or <a href=\"/client/\">go to the Client Area</a>.</p></main></body></html>"
            )),
        ).into_response()
    }

    async fn to_client() -> Redirect {
        Redirect::to("/client/")
    }

    async fn to_admin() -> Redirect {
        Redirect::to("/admin/")
    }
}
