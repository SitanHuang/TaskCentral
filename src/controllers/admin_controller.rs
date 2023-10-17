use axum::{
    routing::{get, post},
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Form
};

use diesel_async::*;
use diesel::prelude::*;
use diesel::dsl::*;
use diesel::sql_types::*;

use serde::{Serialize, Deserialize};
use serde_json::json;

use std::process::Command;

use crate::middleware::client_area;
use crate::middleware::admin_area;
use crate::schema::users::dsl::*;
use crate::schema::users;
use crate::helpers::send_file;
use crate::models::users::User;
use crate::db::functions::*;

use super::app_controller::*;

pub struct AdminController;

#[derive(Deserialize)]
pub struct NewUserForm {
    username: String,
    password: String,
    status: i32,
    email: Option<String>,
}

#[derive(Deserialize)]
struct UserStatsRequest {
    exclude_users: Option<String>,
    include_users: Option<String>,
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
    data: UserSummary,
}

#[derive(Serialize)]
struct UserStatsResponse {
    data: Vec<UserData>,
    uptime: String,
}

impl Controller for AdminController {
    fn route(state: SharedState) -> Router {
        let router = Router::new()
            .route("/", get(Self::index))
            .route("/addUser", post(Self::add_user))
            .route("/userStats", post(Self::user_stats));

        let router = admin_area::wrap_router(router, state.clone());
        client_area::wrap_router(router, state)
    }
}

impl AdminController {
    async fn index() -> Result<impl IntoResponse, StatusCode> {
        send_file::serve_file(
            "app/views/admin/index.html",
            "public, must-revalidate, max-age=120"
        ).await
    }

    async fn add_user(
        State(state): State<SharedState>,
        Form(form): Form<NewUserForm>,
    ) -> Result<String, StatusCode> {
        if form.status < 1 || form.status >= 99 ||
            form.username.is_empty() || form.password.is_empty() {
            return Err(StatusCode::BAD_REQUEST);
        }

        if let Some(_) = User::get_by_uname(&state, &form.username).await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)? {
            return Ok("User exists.".to_string());
        }

        let mut con = state.db().get().await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        diesel::insert_into(users)
            .values(User {
                username: form.username.clone(),
                password: "placeholder".to_string(),
                status: form.status,
                create: crate::commons::timestamp() as i64,
                last_visited: Some(0),
                last_updated: Some(0),
                email: form.email
            })
            .execute(&mut *con).await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        User::get_by_uname(&state, &form.username).await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?
            .passwd(&state, &form.password).await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        Ok("ok".to_string())
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
            .filter(last_updated.gt(0))
            .order(last_updated.desc())
            .limit(100)
            .into_boxed();

        // Handling the exclude regex
        for x in exclude_regex.split(",") {
            query = query.filter(
                sql::<Bool>("LOWER(username) NOT LIKE ")
                .bind::<Text, _>(x)
            );
        }

        if !include_regex.is_empty() {
            // Start with a false condition to make OR chaining easier
            let mut include_conditions: Box<dyn BoxableExpression<users::table, _, SqlType = Bool>> = Box::new(sql::<Bool>("0 = 1"));

            for x in include_regex.split(",") {
                include_conditions = Box::new(
                    include_conditions.or(lower(username).like(x))
                );
            }

            query = query.filter(include_conditions);
        }

        let mut con = state.db().get().await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let dataset: Vec<User> = query.load(&mut con).await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        for user in &dataset {
            let target_path = user.data_path_app(&state);

            match std::fs::read_to_string(&target_path) {
                Ok(content) => {
                    let udat: serde_json::Value = serde_json::from_str(&content).unwrap();

                    let exp = UserSummary {
                        settings: udat["settings"].clone(),
                        comp: udat["comp"].clone(),
                        last_updated: user.last_updated,
                        last_visited: user.last_visited,
                        quota: user.quota(),
                        size: std::fs::metadata(&target_path).unwrap().len(),
                        started: udat.get("started").and_then(|started| {
                            started.as_str().and_then(|s| udat["tasks"].get(s))
                        }).cloned(),
                    };

                    data.push(UserData { user: user.username.clone(), data: exp });
                }
                Err(_) => {
                    // eprintln!("An error occurred: {} {}", user.username, e);
                }
            }
        }

        let uptime = Command::new("uptime").output()
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let uptime = String::from_utf8(uptime.stdout)
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        Ok(json!(UserStatsResponse { data, uptime }).to_string())
    }
}
