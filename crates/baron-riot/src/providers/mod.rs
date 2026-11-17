use std::time::Duration;

pub(crate) mod meraki;
pub(crate) mod opgg;
pub(crate) mod ugg;

/// Shared blocking HTTP GET JSON helper with strict status verification and timeout.
pub(crate) fn http_get_json(url: &str) -> Result<serde_json::Value, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(15))
        .user_agent("baron/0.1")
        .build()
        .map_err(|e| format!("Failed to construct HTTP client: {e}"))?;

    let resp = client
        .get(url)
        .header("Accept", "application/json")
        .send()
        .map_err(|e| format!("HTTP request failed for {url}: {e}"))?;

    let status = resp.status();
    if !status.is_success() {
        return Err(format!("HTTP {status} returned by {url}"));
    }

    resp.json::<serde_json::Value>()
        .map_err(|e| format!("Invalid JSON returned by {url}: {e}"))
}
