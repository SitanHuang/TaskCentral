use axum::{
    routing::{get, post},
    extract::{DefaultBodyLimit, State, Multipart},
    http::StatusCode,
    response::IntoResponse,
    Form
};
use tower_sessions::Session;
use diesel_async::*;
use diesel::prelude::*;
use serde::Deserialize;
use serde_json::json;
use std::path::Path;
use rand::Rng;
use rand::distributions::Alphanumeric;

use crate::middleware::client_area::{self, *};
use crate::schema::users::dsl::*;
use crate::helpers::send_file;
use super::app_controller::*;

pub struct ClientController;

impl Controller for ClientController {
    fn route(state: SharedState) -> Router {
        let router = Router::new()
            .route("/overwrite", post(Self::overwrite))
                .layer(DefaultBodyLimit::max(20971520)) // 20 MiB
            .route("/", get(Self::index))
            .route("/mtime", post(Self::mtime))
            .route("/user/info", post(Self::user_info))
            .route("/user/passwd", post(Self::user_passwd))
            .route("/storage/data", get(Self::data));

        client_area::wrap_router(router, state)

        // Routes that don't need authentication:
    }
}

#[derive(Deserialize)]
pub struct NewPasswordForm {
    new_pswd: String
}

impl ClientController {
    #[inline(always)]
    async fn index() -> Result<impl IntoResponse, StatusCode> {
        send_file::serve_file(
            "app/views/client/index.html",
            "public, must-revalidate, max-age=120"
        ).await
    }

    async fn user_info(
        UserContextWithUserExtractor(ucontext, su): UserContextWithUserExtractor
    ) -> Result<impl IntoResponse, StatusCode> {
        use std::fs;

        let len = fs::metadata(ucontext.su_data_path_app)
            .and_then(|metadata| Ok(metadata.len()))
            .unwrap_or(0); // <- if file doesn't exist

        Ok(json!({
            "name": &su.username,
            "create": &su.create,
            "status": &su.status,
            "quota": su.quota(),
            "size": len
        }).to_string())
    }

    async fn user_passwd(
        State(state): State<SharedState>,
        session: Session,
        UserContextWithUserExtractor(ucontext, mut su): UserContextWithUserExtractor,
        Form(pswd_query): Form<NewPasswordForm>,
    ) -> Result<String, StatusCode> {
        let new_pswd = pswd_query.new_pswd;

        let msg = if let Err(err) = su.validate_newpasswd(&state, &new_pswd) {
            // root can change password to whatever
            if ucontext.root {
                format!("As root, password was changed. ({})", err)
            } else {
                return Ok(err);
            }
        } else {
            String::from("ok")
        };

        su.passwd(&state, &new_pswd).await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        session.flush();

        Ok(msg)
    }

    async fn data(
        UserContextExtractor(ucontext): UserContextExtractor
    ) -> Result<impl IntoResponse, StatusCode> {
        let err = StatusCode::INTERNAL_SERVER_ERROR;

        use std::fs::{self, File};
        use std::io::prelude::*;

        fs::create_dir_all(&ucontext.su_data_dir_app).map_err(|_| err)?;

        // write default data for new users
        if !Path::new(&ucontext.su_data_path_app).exists() {
            const DEF_DATA: &'static str = "{\"tasks\":{},\"projects\":{\"default\":{\"color\":\"#5e5e5e\",\"fontColor\":\"white\",\"lastUsed\":1642952690858,\"number\":0}},\"tags\":{},\"filters\":{}}";

            File::create(&ucontext.su_data_path_app)
                .and_then(|mut f| f.write_all(DEF_DATA.as_bytes()))
                .map_err(|_| err)?;
        }

        send_file::serve_file(&ucontext.su_data_path_app, "no-cache").await
    }

    async fn mtime(
        State(state): State<SharedState>,
        UserContextExtractor(ucontext): UserContextExtractor
    ) -> Result<String, StatusCode> {
        // probably don't want tokio's overhead for this simple file op
        use std::fs;

        if !ucontext.root {
            let time = crate::commons::timestamp() as i64;
            let mut con = state.db().get().await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            diesel::update(users)
                .filter(username.eq(&ucontext.su))
                .set(last_visited.eq(Some(time)))
                .execute(&mut *con)
                .await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        }

        fs::metadata(ucontext.su_data_path_app)
            .and_then(|metadata| metadata.modified())
            .map(|modified| crate::commons::systime_ms(modified).to_string())
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
    }

    async fn overwrite(
        State(state): State<SharedState>,
        UserContextWithUserExtractor(ucontext, su): UserContextWithUserExtractor,
        mut multipart: Multipart
    ) -> Result<String, StatusCode> {
        use tokio::fs::{self, File};
        use tokio::io::AsyncWriteExt;

        // first multipart field has to be "file"
        let mut field = multipart.next_field().await
            .map_err(|_| StatusCode::BAD_REQUEST)?
            .ok_or(StatusCode::BAD_REQUEST)?;

        let name = field.name().ok_or(StatusCode::BAD_REQUEST)?;
        if name != "file" {
            return Err(StatusCode::BAD_REQUEST);
        }

        // write to temp file
        let random_suffix: String = rand::thread_rng()
            .sample_iter(&Alphanumeric)
            .take(4)
            .map(char::from)
            .collect();
        let tmp_path = format!("{}.{}.tmp", &ucontext.su_data_path_app, random_suffix);
        let mut file = File::create(&tmp_path).await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let mut last_char = b' ';
        while let Some(chunk) = field.chunk().await
            .map_err(|_| StatusCode::BAD_REQUEST)? {
            last_char = chunk.last().unwrap_or(&b' ').clone();

            file.write(&chunk).await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        }

        // premature, uncaught disconnection or bad data
        if last_char != b'}' {
            return Err(StatusCode::BAD_REQUEST);
        }

        // closes temp file
        drop(file);

        // check temp file size
        let len = std::fs::metadata(&tmp_path)
            .and_then(|metadata| Ok(metadata.len()))
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        if len > su.quota() {
            return Ok(json!({
                "status": "failed",
                "msg": format!("File size {} KiB > user quota of {} KiB", len, su.quota())
            }).to_string());
        }

        // create .swp
        fs::copy(
            &ucontext.su_data_path_app,
            ucontext.su_data_path_app.clone() + ".swp"
        ).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        // now we move file
        fs::copy(&tmp_path, &ucontext.su_data_path_app).await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        fs::remove_file(&tmp_path).await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        if !ucontext.root {
            let time = crate::commons::timestamp() as i64;
            let mut con = state.db().get().await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            diesel::update(users)
                .filter(username.eq(&ucontext.su))
                .set(last_updated.eq(Some(time)))
                .execute(&mut *con)
                .await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        }

        let len = std::fs::metadata(&ucontext.su_data_path_app)
            .and_then(|metadata| Ok(metadata.len()))
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        Ok(json!({
            "status": "ok",
            "quota": su.quota(),
            "size": len
        }).to_string())
    }
}
