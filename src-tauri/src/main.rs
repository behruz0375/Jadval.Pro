// JadvalPro — Tauri desktop (offline Windows .exe)
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    jadvalpro_lib::run()
}
