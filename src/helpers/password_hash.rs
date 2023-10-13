
use moka::sync::Cache;

use concat_string::concat_string;

use crate::controllers::app_controller::SharedState;

pub type CacheStore = Cache<String, bool>;
pub type VerificationError = bcrypt::BcryptError;

pub fn create_store() -> CacheStore {
    let store_size: u8 = std::env::var("PASSWORD_HASH_CACHE_MB")
        .expect("Environment variable PASSWORD_HASH_CACHE_MB is not set!")
        .parse()
        .expect("Environment variable PASSWORD_HASH_CACHE_MB is not a valid u8!");

    Cache::builder()
        // A weigher closure takes &K and &V and returns a u32
        // representing the relative size of the entry.
        .weigher(|key: &String, _| -> u32 {
            key.len().try_into().unwrap_or(u32::MAX)
        })
        .max_capacity((store_size as u64) * 1024 * 1024)
        .build()
}

pub fn verify(
    state: &SharedState,
    pswd: &str,
    hash: &str
) -> Result<bool, VerificationError> {
    // 5x faster than format!()
    let key = concat_string!(pswd, hash);

    let cache = &state.password_hash_cache;

    Ok(
        if let Some(result) = cache.get(&key) {
            result
        } else {
            let result = bcrypt::verify(&pswd, &hash)?;

            cache.insert(key, result);

            result
        }
    )
}
