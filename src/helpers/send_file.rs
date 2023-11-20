use axum::{
    body::StreamBody,
    http::{Request, header, StatusCode},
    response::IntoResponse,
};
use tower::ServiceExt;
use tower_http::services::ServeFile;
use axum::body::Body;

#[inline]
#[allow(dead_code)]
pub async fn bin_async(file: &str, fname: &str, cache_control: &str) -> Result<impl IntoResponse, StatusCode> {
    use tokio_util::io::ReaderStream;
    use tokio::fs::File;

    let file = match File::open(file).await {
        Ok(file) => file,
        Err(_) => return Err(StatusCode::NOT_FOUND),
    };
    let stream = ReaderStream::new(file);
    let body = StreamBody::new(stream);
    let disposition = format!("attachment; filename=\"{fname}\"");

    let headers = [
        (header::CONTENT_TYPE, "application/octet-stream".to_string()),
        (header::CONTENT_DISPOSITION, disposition),
        (header::CACHE_CONTROL, cache_control.to_string()),
    ];

    Ok((headers, body))
}

/// Wraps ServeFile to send file (about twice faster than bin_async).
#[inline]
pub async fn serve_file(file: &str, cache_control: &str) -> Result<impl IntoResponse, StatusCode> {
    let mut res = ServeFile::new(file)
        .oneshot(Request::new(Body::empty())).await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    res.headers_mut().insert("Cache-Control", cache_control.parse().unwrap());
    Ok(res)
}
