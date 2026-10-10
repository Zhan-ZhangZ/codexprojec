use moli_web_mime::{
    FetchDestination, ScriptResponseMimeError, check_script_response_mime,
    extract_response_mime_type,
};
use url::Url;

pub(crate) fn ensure_worker_script_mime_acceptable(
    script_url: &Url,
    headers: &[(String, Vec<u8>)],
    body: &[u8],
) -> Result<(), String> {
    check_script_response_mime(headers, body, FetchDestination::Worker, true)
        .map_err(|error| worker_script_mime_error_message(script_url, error))
}

pub(crate) fn worker_response_content_type(headers: &[(String, Vec<u8>)]) -> Option<String> {
    extract_response_mime_type(headers).map(|mime| mime.to_string())
}

pub(crate) fn worker_response_has_webassembly_mime(headers: &[(String, Vec<u8>)]) -> bool {
    worker_response_content_type(headers)
        .as_deref()
        .is_some_and(moli_web_mime::is_webassembly_mime)
}

fn worker_script_mime_error_message(script_url: &Url, error: ScriptResponseMimeError) -> String {
    match error {
        ScriptResponseMimeError::Nosniff => format!(
            "Failed to load worker script `{script_url}`: blocked by X-Content-Type-Options nosniff."
        ),
        ScriptResponseMimeError::Unsupported(mime_type) => format!(
            "Failed to load worker script `{script_url}`: unsupported script MIME type `{mime_type}`."
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn worker_script_mime_accepts_javascript_content_types() {
        let url = Url::parse("https://example.test/worker.js").expect("valid url");
        let headers: Vec<(String, Vec<u8>)> = vec![(
            "Content-Type".to_owned(),
            b"Text/JavaScript; charset=utf-8".to_vec(),
        )];

        assert!(ensure_worker_script_mime_acceptable(&url, &headers, b"").is_ok());
    }

    #[test]
    fn worker_script_mime_rejects_http_non_javascript_content_types() {
        let url = Url::parse("https://example.test/worker.py").expect("valid url");
        let headers: Vec<(String, Vec<u8>)> =
            vec![("content-type".to_owned(), b"text/html".to_vec())];

        assert!(ensure_worker_script_mime_acceptable(&url, &headers, b"").is_err());
    }

    #[test]
    fn worker_script_mime_rejects_missing_content_type() {
        let blob_url = Url::parse("blob:https://example.test/id").expect("valid url");
        let http_url = Url::parse("https://example.test/worker").expect("valid url");

        // Classic blob/data main scripts are materialized without this check;
        // imported scripts and modules still require a JavaScript MIME type.
        assert!(ensure_worker_script_mime_acceptable(&blob_url, &[], b"").is_err());
        assert!(ensure_worker_script_mime_acceptable(&http_url, &[], b"").is_err());
    }

    #[test]
    fn worker_script_mime_rejects_invalid_content_type() {
        let url = Url::parse("https://example.test/worker").expect("valid url");
        let headers: Vec<(String, Vec<u8>)> =
            vec![("content-type".to_owned(), b"not a mime type".to_vec())];

        assert!(ensure_worker_script_mime_acceptable(&url, &headers, b"").is_err());
    }

    #[test]
    fn worker_script_mime_rejects_nosniff_missing_content_type() {
        let url = Url::parse("https://example.test/worker").expect("valid url");
        let headers: Vec<(String, Vec<u8>)> =
            vec![("x-content-type-options".to_owned(), b"nosniff".to_vec())];

        assert!(ensure_worker_script_mime_acceptable(&url, &headers, b"").is_err());
    }

    #[test]
    fn worker_javascript_and_wasm_mime_use_complete_header_lists() {
        let url = Url::parse("https://example.test/worker").unwrap();
        for mime in ["text/javascript", "application/wasm"] {
            for (values, accepts) in [
                (vec!["text/plain".to_owned(), mime.to_owned()], true),
                (vec![format!("text/plain, {mime}")], true),
                (
                    vec![mime.to_owned(), "invalid".to_owned(), "*/*".to_owned()],
                    true,
                ),
                (vec![mime.to_owned(), "text/plain".to_owned()], false),
                (vec![format!("{mime}, text/plain")], false),
                (vec![format!(r#"text/plain; a=",{mime}""#)], false),
                (vec![], false),
            ] {
                let headers: Vec<_> = values
                    .iter()
                    .map(|value| ("Content-Type".to_owned(), value.as_bytes().to_vec()))
                    .collect();
                let accepted = if mime == "application/wasm" {
                    worker_response_has_webassembly_mime(&headers)
                } else {
                    ensure_worker_script_mime_acceptable(&url, &headers, b"").is_ok()
                };
                assert_eq!(accepted, accepts, "{mime}: {values:?}");
            }
        }
    }
}
