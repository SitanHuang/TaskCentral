use bcrypt::{hash, verify};
use diesel_async::*;
use diesel::prelude::*;
use tower_sessions::Session;
use serde::{Deserialize, Serialize};

use crate::{
    db::DBError,
    controllers::app_controller::SharedState,
    schema::users::dsl::users,
    middleware::client_area::{*}
};

#[derive(
    Queryable, AsChangeset, Insertable, Selectable, Identifiable,
    Debug, Deserialize, Serialize
)]
#[diesel(table_name = crate::schema::users)]
#[diesel(check_for_backend(diesel::mysql::Mysql))]
#[diesel(primary_key(username))]
pub struct User {
    pub username: String,
    pub password: String,
    pub create: i64,
    pub status: i32,
    pub last_visited: Option<i64>,
    pub last_updated: Option<i64>,
    pub email: Option<String>,
}

pub enum PasswdError {
    DBError(DBError),
    HashingError
}

impl User {
    #[inline]
    pub fn data_path_app(&self, state: &SharedState) -> String {
        format!("{}/res/storage/{}", state.app_root, self.data_path())
    }

    #[inline]
    pub fn data_dir_app(&self, state: &SharedState) -> String {
        format!("{}/res/storage/{}", state.app_root, self.data_dir())
    }

    #[inline]
    pub fn data_path(&self) -> String {
        format!("{}{}", self.data_dir(), self.username)
    }

    #[inline]
    pub fn data_dir(&self) -> String {
        let prefix = self.username.chars().take(3).collect::<String>();
        let padded = format!("{:_<3}", prefix);
        padded.chars().map(|c| format!("{}/", c)).collect()
    }

    #[inline]
    pub fn is_root(&self) -> bool {
        self.status >= 99
    }

    // file upload still limited by DefaultBodyLimit to 20MiB
    #[inline]
    pub fn quota(&self) -> u64 {
        // 126kb > 505kb > 1.1mb > 2.0mb > 3.1mb > 4.4mb > 6.0mb > 7.9mb > 10.mb
        // 1       2       3       4       5       6       7       8       9
        ((self.status as f64 / 9.0).powi(2) * 10485760f64).floor() as u64
    }

    #[inline]
    pub async fn get_by_uname(
        state: &SharedState,
        uname: &str,
    ) -> Result<Option<Self>, DBError> {
        let con = state.db().get().await;
        if let Ok(mut con) = con {
            if let Ok(user) = users.find(uname)
                .select(Self::as_select())
                .first(&mut con)
                .await {
                Ok(Some(user))
            } else {
                Ok(None)
            }
        } else {
            Err(DBError::PoolError)
        }
    }

    #[inline]
    pub async fn su_from_session(
        state: &SharedState,
        session: &Session
    ) -> Result<Option<(UserContext, Self)>, DBError> {
        if let Ok(Some(ucontext)) = session.get::<UserContext>(USER_CONTEXT_KEY) {
            match Self::get_by_uname(&state, &ucontext.su).await {
                Ok(Some(user)) => Ok(Some((ucontext, user))),
                Ok(None) => Ok(None),
                Err(e) => Err(e)
            }
        } else {
            Ok(None)
        }
    }

    #[inline]
    pub async fn authenticate(
        state: &SharedState,
        uname: &str,
        pswd: &str
    ) -> Result<Option<Self>, DBError> {
        if uname.is_empty() || pswd.is_empty() {
            return Ok(None);
        }
        Ok(
            Self::get_by_uname(&state, uname).await?
                .and_then(|user|
                    verify(pswd, &user.password)
                        .map_or(None, |x| x.then(|| user))
                )
        )
    }

    pub async fn passwd(
        &mut self,
        state: &SharedState,
        new_pass: &str)
    -> Result<(), PasswdError>{
        use diesel_async::*;
        use diesel::prelude::*;
        use crate::schema::users::dsl::*;

        // root uses higher cost:
        let cost = self.is_root().then(|| 12).unwrap_or(6);
        self.password = hash(new_pass, cost)
            .map_err(|_| PasswdError::HashingError)?;

        let mut con = state.db().get().await
            .map_err(|e| PasswdError::DBError(e))?;

        diesel::update(users)
            .filter(username.eq(&self.username))
            .set(password.eq(&self.password))
            .execute(&mut *con)
            .await.map_err(|_| PasswdError::DBError(DBError::QueryError))?;

        Ok(())
    }

    pub fn validate_newpasswd(&self, new_pswd: &str) -> Result<(), String> {
        if new_pswd.len() < 10 || new_pswd.len() > 30 {
            return Err("Password should be at least 10 characters long but not longer than 30.".to_string());
        }
        if verify(new_pswd, &self.password).unwrap_or(false) {
            return Err("New password should not be the same as the previous password.".to_string());
        }

        let has_uppercase = new_pswd.chars().any(|c| c.is_uppercase());
        let has_lowercase = new_pswd.chars().any(|c| c.is_lowercase());
        let has_digit = new_pswd.chars().any(|c| c.is_numeric());
        let has_special = new_pswd.chars().any(|c| !c.is_alphanumeric() && !c.is_whitespace());

        if has_uppercase && has_lowercase && has_digit && has_special {
            Ok(())
        } else {
            Err("Password should contain at least one uppercase letter, one lowercase letter, one number, and one special character.".to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::User;

    fn gen_test_user() -> User {
        User {
            username: "user".to_string(),
            password: "passwd".to_string(),
            create: 0,
            status: 1,
            last_visited: Some(0),
            last_updated: Some(0),
            email: Some("user@email.com".to_string()),
        }
    }

    #[test]
    fn gives_correct_data_path() {
        let mut user = gen_test_user();
        user.username = "username".to_string();
        assert_eq!(user.data_path(), "u/s/e/username");
        user.username = "us".to_string();
        assert_eq!(user.data_path(), "u/s/_/us");
        user.username = "u".to_string();
        assert_eq!(user.data_path(), "u/_/_/u");
    }

    #[test]
    fn status_gives_correct_quota() {
        let mut user = gen_test_user();
        user.status = 1;
        assert_eq!(user.quota(), 129453);
        user.status = 5;
        assert_eq!(user.quota(), 3236345);
    }
}
