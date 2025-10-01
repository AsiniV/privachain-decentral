// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod dpi_fetch;

use dpi_fetch::dpi_fetch;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![dpi_fetch])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
