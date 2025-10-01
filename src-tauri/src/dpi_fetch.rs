use std::time::Duration;

use fastrand;
use reqwest::{Client, Proxy, redirect::Policy};
use serde::Serialize;
use tauri::command;
use url::Url;

#[derive(Serialize)]
pub struct FetchResult {
    status: u16,
    headers: Vec<(String, String)>,
    body: Vec<u8>,
}

#[command]
pub async fn dpi_fetch(url: String, tor: bool) -> Result<FetchResult, String> {
    // Validate URL
    let parsed_url = Url::parse(&url).map_err(|e| format!("Invalid URL: {}", e))?;

    let client = build_client(tor).map_err(|e| format!("Failed to build client: {}", e))?;

    let resp = client.get(parsed_url.as_str())
        .header("Cache-Control", "no-cache")
        .header("User-Agent", random_ua())
        .timeout(Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = resp.status().as_u16();

    let mut headers = Vec::new();
    for (k, v) in resp.headers().iter() {
        let key = k.to_string();
        headers.push((key, v.to_str().unwrap_or_default().to_string()));
    }

    let body = resp.bytes()
        .await
        .map_err(|e| format!("Failed to read body: {}", e))?
        .to_vec();

    Ok(FetchResult { status, headers, body })
}

fn build_client(tor: bool) -> reqwest::Result<Client> {
    let mut builder = Client::builder()
        .redirect(Policy::limited(5));  // Limit redirects to prevent loops

    if tor {
        // Route via local Tor SOCKS (assumes Tor/Arti running on 127.0.0.1:9050)
        let proxy = Proxy::all("socks5h://127.0.0.1:9050")?;
        builder = builder.proxy(proxy);
    }

    builder.build()
}

fn random_ua() -> String {
    let uas = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    ];
    uas[rand_index(uas.len())].to_string()
}

fn rand_index(n: usize) -> usize {
    fastrand::usize(..n)
}
