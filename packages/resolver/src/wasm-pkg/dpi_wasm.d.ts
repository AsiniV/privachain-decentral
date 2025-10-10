/* tslint:disable */
/* eslint-disable */
/**
 * WASM-bindgen wrapper for dpi_dial that properly handles JavaScript interop
 * 
 * This function:
 * - Uses #[wasm_bindgen] attribute for proper JS bindings
 * - Returns js_sys::Uint8Array instead of Vec<u8> (lighter weight)
 * - Bubbles Rust panics as JS exceptions via Result<T, JsValue>
 * - Uses async/await for proper promise handling in JavaScript
 * 
 * # Arguments
 * * `url` - The URL to fetch with DPI bypass
 * * `transport` - The transport method to use (e.g., "domain-fronting", "obfs5")
 */
export function dpi_dial(url: string, transport: string): Promise<Uint8Array>;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly dpi_dial: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_0: (a: number) => void;
  readonly __wbindgen_export_1: (a: number, b: number) => number;
  readonly __wbindgen_export_2: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_3: WebAssembly.Table;
  readonly __wbindgen_export_4: (a: number, b: number, c: number) => void;
  readonly __wbindgen_export_5: (a: number, b: number, c: number, d: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
