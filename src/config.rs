use dotenv;

use crate::db::DBContext;

pub struct AppContext {
    bind_host: String,
    bind_port: String,

    session_store_size: u64,

    db: DBContext,
    pub app_root: String,
}

impl AppContext {
    #[inline]
    pub fn db(&self) -> &DBContext {
       &self.db
    }

    pub fn init(env_path: &str) -> Self {
        dotenv::from_filename(env_path)
            .expect("config.env should be in current working directory!");

        Self {
            bind_host: std::env::var("HOST")
                .expect("Environment variable HOST is not set!"),
            bind_port: std::env::var("PORT")
                .expect("Environment variable PORT is not set!"),

            session_store_size: std::env::var("SESSION_STORE_SIZE")
                .expect("Environment variable SESSION_STORE_SIZE is not set!")
                .parse()
                .expect("Environment variable SESSION_STORE_SIZE is not integer!"),

            db: DBContext::init(),
            app_root: std::env::var("APP_DIR")
                .expect("Environment variable APP_DIR is not set!"),
        }
    }

    pub fn get_bind(&self) -> String {
        format!("{}:{}", self.bind_host, self.bind_port)
    }

    pub fn get_session_store_size(&self) -> u64 {
        self.session_store_size
    }
}
