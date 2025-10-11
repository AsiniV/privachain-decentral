# DPI-WASM - DPI Bypass WebAssembly Module

This package provides a WebAssembly wrapper for the DPI bypass functionality, enabling JavaScript applications to perform DPI-resistant network requests.

## Features

- **Proper WASM Bindings**: Uses `#[wasm_bindgen]` for seamless JavaScript interop
- **Lightweight**: Returns `js_sys::Uint8Array` instead of `Vec<u8>` for better performance
- **Error Handling**: Bubbles Rust panics as JavaScript exceptions via `Result<T, JsValue>`
- **Async/Await**: Native Promise support in JavaScript

## Building

### Option 1: Using the build script
```bash
cd packages/resolver/wasm
./build.sh
```

### Option 2: Using wasm-pack directly
```bash
cd packages/resolver/wasm
wasm-pack build --target web --out-dir ../src/wasm-pkg
```

This will generate:
- `dpi_wasm.js` - JavaScript bindings
- `dpi_wasm_bg.wasm` - WebAssembly binary
- `dpi_wasm.d.ts` - TypeScript definitions
- `dpi_wasm_bg.wasm.d.ts` - TypeScript definitions for WASM exports
- `package.json` - Package metadata

### Testing the Example

```bash
cd packages/resolver/wasm
python3 -m http.server 8000
# Open http://localhost:8000/example.html in your browser
```

## Usage

```javascript
import init, { dpi_dial } from './wasm-pkg/dpi_wasm.js';

// Initialize the WASM module
await init();

// Use the DPI bypass function
try {
  const data = await dpi_dial('https://example.com', 'domain-fronting');
  console.log('Fetched data:', data);
} catch (error) {
  console.error('DPI bypass failed:', error);
}
```

## API

### `dpi_dial(url: string, transport: string): Promise<Uint8Array>`

Fetches data from the given URL using DPI bypass techniques.

**Parameters:**
- `url`: The URL to fetch
- `transport`: The transport method to use (e.g., 'domain-fronting', 'obfs5')

**Returns:** A Promise that resolves to a `Uint8Array` containing the response data

**Throws:** A JavaScript error if the request fails

## Transport Methods

- `domain-fronting`: Uses domain fronting techniques to bypass DPI
- `obfs5`: Uses Obfs5 protocol for traffic obfuscation (requires server support)
- Any other value: Falls back to standard fetch with CORS

## Development

The implementation is split into two parts:

1. **Native Rust Library** (`dpi-bypass` crate): Contains the core DPI bypass logic
2. **WASM Wrapper** (this package): Provides JavaScript bindings with proper error handling and type conversions

For WASM builds, the implementation uses browser APIs (fetch, etc.) for compatibility.
