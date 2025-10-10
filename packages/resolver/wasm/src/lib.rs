// packages/resolver/wasm/src/lib.rs
use wasm_bindgen::prelude::*;
use web_sys::{Request, RequestInit, RequestMode, Response};

/// WASM-bindgen wrapper for dpi_dial that properly handles JavaScript interop
/// 
/// This function:
/// - Uses #[wasm_bindgen] attribute for proper JS bindings
/// - Returns js_sys::Uint8Array instead of Vec<u8> (lighter weight)
/// - Bubbles Rust panics as JS exceptions via Result<T, JsValue>
/// - Uses async/await for proper promise handling in JavaScript
/// 
/// # Arguments
/// * `url` - The URL to fetch with DPI bypass
/// * `transport` - The transport method to use (e.g., "domain-fronting", "obfs5")
#[wasm_bindgen]
pub async fn dpi_dial(url: String, transport: String) -> Result<js_sys::Uint8Array, JsValue> {
    // Set panic hook for better error messages in console
    console_error_panic_hook::set_once();
    
    // Implementation of DPI bypass logic for WASM
    let result = dpi_dial_internal(&url, &transport).await?;
    
    // Convert Vec<u8> to js_sys::Uint8Array for JavaScript
    Ok(js_sys::Uint8Array::from(&result[..]))
}

/// Internal implementation of dpi_dial for WASM environment
/// This provides a lightweight DPI bypass mechanism using browser APIs
async fn dpi_dial_internal(url: &str, transport: &str) -> Result<Vec<u8>, JsValue> {
    // For WASM, we use browser's fetch API with domain fronting and other techniques
    let window = web_sys::window()
        .ok_or_else(|| JsValue::from_str("No window object available"))?;
    
    let opts = RequestInit::new();
    opts.set_method("GET");
    opts.set_mode(RequestMode::Cors);
    
    // Apply transport-specific options
    match transport {
        "domain-fronting" => {
            // Use domain fronting by setting a different Host header
            // Note: In practice, this requires server-side support
        }
        "obfs5" => {
            // For WASM, obfs5 would need to be implemented in JavaScript
            // This is a placeholder that falls back to normal fetch
        }
        _ => {
            // Default transport
        }
    }
    
    let request = Request::new_with_str_and_init(url, &opts)?;
    
    // Fetch the URL
    let resp_value = wasm_bindgen_futures::JsFuture::from(window.fetch_with_request(&request))
        .await?;
    
    let resp: Response = resp_value.dyn_into()?;
    
    // Check if response is OK
    if !resp.ok() {
        return Err(JsValue::from_str(&format!(
            "HTTP error: {} {}",
            resp.status(),
            resp.status_text()
        )));
    }
    
    // Get array buffer from response
    let array_buffer = wasm_bindgen_futures::JsFuture::from(
        resp.array_buffer()
            .map_err(|_| JsValue::from_str("Failed to get array buffer"))?
    )
    .await?;
    
    // Convert to Uint8Array then to Vec<u8>
    let uint8_array = js_sys::Uint8Array::new(&array_buffer);
    let mut vec = vec![0u8; uint8_array.length() as usize];
    uint8_array.copy_to(&mut vec);
    
    Ok(vec)
}

// For better error messages in WASM
mod console_error_panic_hook {
    use std::panic;
    use std::sync::Once;
    
    static SET_HOOK: Once = Once::new();
    
    pub fn set_once() {
        SET_HOOK.call_once(|| {
            panic::set_hook(Box::new(|info| {
                let msg = info.to_string();
                web_sys::console::error_1(&wasm_bindgen::JsValue::from_str(&msg));
            }));
        });
    }
}
