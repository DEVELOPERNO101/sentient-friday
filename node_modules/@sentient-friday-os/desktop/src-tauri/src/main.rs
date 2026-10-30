#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod sidecar;

use sidecar::LocalInferenceSidecar;

fn main() {
    let sidecar = LocalInferenceSidecar::new();
    if let Err(err) = sidecar.validate() {
        eprintln!("sidecar configuration invalid: {err}");
    }

    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
