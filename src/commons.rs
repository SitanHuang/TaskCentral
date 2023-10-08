use std::time::{SystemTime, UNIX_EPOCH};

#[inline(always)]
pub fn timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards.")
        .as_millis() as u64
}

#[inline(always)]
pub fn systime_ms(systime: SystemTime) -> i64 {
    match systime.duration_since(UNIX_EPOCH) {
        Ok(x) => x.as_millis() as i64,
        Err(x) => -(x.duration().as_millis() as i64)
    }
}

