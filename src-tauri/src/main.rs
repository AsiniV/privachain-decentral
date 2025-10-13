// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod dpi_fetch;
mod commands;

use dpi_fetch::dpi_fetch;
use commands::{clipboard_read_text, clipboard_write_text, file_system_pick};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            dpi_fetch,
            clipboard_read_text,
            clipboard_write_text,
            file_system_pick
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
