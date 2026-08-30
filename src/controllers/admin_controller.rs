use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Form, Json,
};
use bcrypt::hash;

use diesel::dsl::*;
use diesel::prelude::*;
use diesel::sql_types::*;
use diesel_async::RunQueryDsl;

use serde::{Deserialize, Serialize};
use serde_json::json;

use std::process::Command;

use crate::db::functions::*;
use crate::helpers::send_file;
use crate::middleware::admin_area;
use crate::middleware::client_area;
use crate::middleware::client_area::UserContextExtractor;
use crate::models::users::{validate_email, validate_signup_password, validate_username, User};
use crate::schema::signup_limit;
use crate::schema::users;
use crate::schema::users::dsl::*;

use super::app_controller::*;
use super::index_controller::SIGNUP_INTERVAL_MILLISECONDS;

pub struct AdminController;

#[derive(Deserialize)]
pub struct NewUserForm {
    username: String,
    password: String,
    status: i32,
    email: Option<String>,
    notes: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateUserForm {
    username: String,
    status: i32,
    email: Option<String>,
    notes: String,
}

#[derive(Deserialize)]
struct DeleteUsersRequest {
    usernames: Vec<String>,
}

#[derive(Deserialize)]
struct UserStatsRequest {
    exclude_users: Option<String>,
    include_users: Option<String>,
    #[serde(default = "default_true")]
    nonzero_last_visit: bool,
    #[serde(default = "default_true")]
    nonzero_last_write: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Serialize)]
struct UserSummary {
    settings: serde_json::Value,
    comp: serde_json::Value,
    last_updated: Option<i64>,
    last_visited: Option<i64>,
    quota: u64,
    size: u64,
    started: Option<serde_json::Value>,
}

#[derive(Serialize)]
struct UserData {
    user: String,
    email: String,
    notes: String,
    status: i32,
    create: i64,
    is_root: bool,
    data: UserSummary,
}

#[derive(Serialize)]
struct UserStatsResponse {
    data: Vec<UserData>,
    uptime: String,
    total_users: i64,
    signup_status: SignupStatus,
}

#[derive(Serialize)]
struct SignupStatus {
    last_signup: i64,
    limited_until: i64,
    available: bool,
    signup_count: i32,
    signup_cap: u32,
}

impl Controller for AdminController {
    fn route(state: SharedState) -> Router {
        let router = Router::new()
            .route("/", get(Self::index))
            .route("/addUser", post(Self::add_user))
            .route("/updateUser", post(Self::update_user))
            .route("/deleteUsers", post(Self::delete_users))
            .route("/raiseSignupCap", post(Self::raise_signup_cap))
            .route("/userStats", post(Self::user_stats));

        let router = admin_area::wrap_router(router, state.clone());
        client_area::wrap_router(router, state)
    }
}

impl AdminController {
    async fn index() -> Result<impl IntoResponse, StatusCode> {
        send_file::serve_file(
            "app/views/admin/index.html",
            "public, must-revalidate, max-age=120",
        )
        .await
    }

    async fn add_user(
        State(state): State<SharedState>,
        Form(form): Form<NewUserForm>,
    ) -> Result<String, StatusCode> {
        let username_value = form.username.trim();
        let email_value = form.email.as_deref().unwrap_or("").trim();
        let notes_value = form.notes.unwrap_or_default();

        if form.status < 1
            || form.status >= 99
            || validate_username(username_value).is_err()
            || validate_signup_password(&form.password).is_err()
            || (!email_value.is_empty() && validate_email(email_value).is_err())
            || notes_value.len() > 65_535
        {
            return Err(StatusCode::BAD_REQUEST);
        }

        if let Some(_) = User::get_by_uname(&state, username_value)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        {
            return Ok("User exists.".to_string());
        }

        let hashed_password =
            hash(&form.password, 6).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let mut con = state
            .db()
            .get()
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        diesel::insert_into(users)
            .values(User {
                username: username_value.to_string(),
                password: hashed_password,
                status: form.status,
                create: crate::commons::timestamp() as i64,
                last_visited: Some(0),
                last_updated: Some(0),
                email: (!email_value.is_empty()).then(|| email_value.to_string()),
                notes: notes_value,
            })
            .execute(&mut *con)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        Ok("ok".to_string())
    }

    async fn update_user(
        State(state): State<SharedState>,
        Form(form): Form<UpdateUserForm>,
    ) -> Result<String, StatusCode> {
        let email_value = form.email.as_deref().unwrap_or("").trim();
        if form.status < 1
            || form.status >= 99
            || (!email_value.is_empty() && validate_email(email_value).is_err())
            || form.notes.len() > 65_535
        {
            return Err(StatusCode::BAD_REQUEST);
        }

        let existing = User::get_by_uname(&state, &form.username)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .ok_or(StatusCode::NOT_FOUND)?;
        if existing.is_root() {
            return Err(StatusCode::FORBIDDEN);
        }

        let mut con = state
            .db()
            .get()
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        diesel::update(users.filter(username.eq(&form.username)))
            .set((
                status.eq(form.status),
                email.eq((!email_value.is_empty()).then(|| email_value.to_string())),
                crate::schema::users::notes.eq(form.notes),
            ))
            .execute(&mut *con)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        Ok("ok".to_string())
    }

    async fn delete_users(
        State(state): State<SharedState>,
        UserContextExtractor(_): UserContextExtractor,
        Json(form): Json<DeleteUsersRequest>,
    ) -> Result<Json<serde_json::Value>, StatusCode> {
        if form.usernames.is_empty() || form.usernames.len() > 100 {
            return Err(StatusCode::BAD_REQUEST);
        }

        let mut deleted = Vec::new();
        let mut failed = Vec::new();
        for target in form.usernames {
            let Some(user) = User::get_by_uname(&state, &target)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            else {
                failed.push(json!({"username": target, "reason": "User not found."}));
                continue;
            };
            if user.is_root() {
                failed.push(json!({"username": target, "reason": "Root users cannot be deleted."}));
                continue;
            }

            let data_path = user.data_path_app(&state);
            let staged_path = format!("{}.deleting.{}", data_path, crate::commons::timestamp());
            let staged = match tokio::fs::rename(&data_path, &staged_path).await {
                Ok(()) => true,
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => false,
                Err(_) => {
                    failed.push(
                        json!({"username": target, "reason": "Could not remove stored user data."}),
                    );
                    continue;
                }
            };

            let mut con = state
                .db()
                .get()
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            if diesel::delete(users.filter(username.eq(&target)))
                .execute(&mut *con)
                .await
                .is_err()
            {
                if staged {
                    let _ = tokio::fs::rename(&staged_path, &data_path).await;
                }
                failed.push(json!({"username": target, "reason": "Could not delete account."}));
                continue;
            }

            if staged {
                let _ = tokio::fs::remove_file(&staged_path).await;
            }
            deleted.push(target);
        }

        Ok(Json(json!({"deleted": deleted, "failed": failed})))
    }

    async fn raise_signup_cap(State(state): State<SharedState>) -> Json<serde_json::Value> {
        Json(json!({"signup_cap": state.raise_signup_cap()}))
    }

    async fn user_stats(
        State(state): State<SharedState>,
        Form(form): Form<UserStatsRequest>,
    ) -> Result<String, StatusCode> {
        let mut data = Vec::new();

        let exclude_regex = form.exclude_users.as_deref().unwrap_or("");
        let include_regex = form.include_users.as_deref().unwrap_or("");

        let mut query = users
            .select(User::as_select())
            .order(last_updated.desc())
            .limit(100)
            .into_boxed();

        if form.nonzero_last_visit {
            query = query.filter(last_visited.gt(0));
        }
        if form.nonzero_last_write {
            query = query.filter(last_updated.gt(0));
        }

        // Handling the exclude regex
        for x in exclude_regex.split(",") {
            query = query.filter(sql::<Bool>("LOWER(username) NOT LIKE ").bind::<Text, _>(x));
        }

        if !include_regex.is_empty() {
            // Start with a false condition to make OR chaining easier
            let mut include_conditions: Box<
                dyn BoxableExpression<users::table, _, SqlType = Bool>,
            > = Box::new(sql::<Bool>("0 = 1"));

            for x in include_regex.split(",") {
                include_conditions = Box::new(include_conditions.or(lower(username).like(x)));
            }

            query = query.filter(include_conditions);
        }

        let mut con = state
            .db()
            .get()
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let total_users = users
            .count()
            .get_result(&mut con)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let (last_signup, window_started, signup_count) = signup_limit::table
            .find(1)
            .select((
                signup_limit::last_signup,
                signup_limit::window_started,
                signup_limit::signup_count,
            ))
            .first::<(i64, i64, i32)>(&mut con)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        let limited_until = if window_started == 0 {
            0
        } else {
            window_started.saturating_add(SIGNUP_INTERVAL_MILLISECONDS)
        };
        let window_expired =
            window_started == 0 || crate::commons::timestamp() as i64 >= limited_until;
        let signup_count = if window_expired { 0 } else { signup_count };
        let signup_cap = state.signup_cap();
        let signup_status = SignupStatus {
            last_signup,
            limited_until,
            available: window_expired || u32::try_from(signup_count).unwrap_or(0) < signup_cap,
            signup_count,
            signup_cap,
        };

        let dataset: Vec<User> = query
            .load(&mut con)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        for user in dataset {
            let target_path = user.data_path_app(&state);
            let content = std::fs::read_to_string(&target_path).ok();
            let udat = content
                .as_deref()
                .and_then(|value| serde_json::from_str::<serde_json::Value>(value).ok());
            let size = std::fs::metadata(&target_path)
                .map(|meta| meta.len())
                .unwrap_or(0);
            let settings = udat
                .as_ref()
                .map(|value| value["settings"].clone())
                .unwrap_or_default();
            let comp = udat
                .as_ref()
                .map(|value| value["comp"].clone())
                .unwrap_or_default();
            let started = udat.as_ref().and_then(|value| {
                value
                    .get("started")
                    .and_then(|started| started.as_str().and_then(|key| value["tasks"].get(key)))
                    .cloned()
            });
            let exp = UserSummary {
                settings,
                comp,
                last_updated: user.last_updated,
                last_visited: user.last_visited,
                quota: user.quota(),
                size,
                started,
            };

            let is_root = user.is_root();
            data.push(UserData {
                user: user.username,
                email: user.email.unwrap_or_default(),
                notes: user.notes,
                status: user.status,
                create: user.create,
                is_root,
                data: exp,
            });
        }

        let uptime = Command::new("uptime")
            .output()
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let uptime =
            String::from_utf8(uptime.stdout).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        Ok(json!(UserStatsResponse {
            data,
            uptime,
            total_users,
            signup_status,
        })
        .to_string())
    }
}
