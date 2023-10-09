pub mod functions;

use deadpool::Runtime;
use deadpool::managed::{Object, PoolConfig, Timeouts};

use diesel_async::AsyncMysqlConnection;
use diesel_async::pooled_connection::AsyncDieselConnectionManager;
use diesel_async::pooled_connection::deadpool::Pool;

pub type Connection = AsyncMysqlConnection;

#[derive(Debug)]
pub enum DBError {
    PoolError,
    QueryError,
}

pub struct DBContext {
    pool: Pool<Connection>
}

impl DBContext {
    #[inline]
    pub async fn get(&self) -> Result<Object<AsyncDieselConnectionManager<Connection>>, DBError> {
        if let Ok(con) = self.pool.get().await {
            Ok(con)
        } else {
            Err(DBError::PoolError)
        }
    }

    pub fn init() -> Self {
        let db_url = std::env::var("DB_URL")
            .expect("Environment variable DB_URL is not set!");
        let timeout = std::env::var("DB_TIMEOUT_MS")
            .expect("Environment variable DB_TIMEOUT_MS is not set!")
            .parse::<u64>()
            .expect("Cannot parse DATABASE_TIMEOUT_MS!");

        let config = AsyncDieselConnectionManager::<Connection>::new(db_url);
        let pconfig = PoolConfig::default();
        let pool = Pool::builder(config)
            .runtime(Runtime::Tokio1)
            .config(PoolConfig {
                timeouts: Timeouts::wait_millis(timeout),
                ..pconfig
            })
            .build()
            .expect("Failed to initialize database pool.");

        Self { pool }
    }
}

