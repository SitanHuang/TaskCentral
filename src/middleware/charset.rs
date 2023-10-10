use axum::{
    middleware::Next,
    response::Response,
    http::{
        Request,
        HeaderValue,
        header::CONTENT_TYPE
    }
};

pub async fn append_charset_utf8<B>(
    request: Request<B>,
    next: Next<B>,
) -> Response {
    let mut res = next.run(request).await;

    if let Some(content_type) = res.headers_mut().get_mut(CONTENT_TYPE) {
        let value = content_type.to_str().unwrap_or_default();
        if !value.contains("charset=utf8") &&
           !value.contains("charset=utf-8") {
            let new_val = format!("{}; charset=utf-8", value);
            *content_type = HeaderValue::from_str(&new_val).unwrap();
        }
    }

    res
}

