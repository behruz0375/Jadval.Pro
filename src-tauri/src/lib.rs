// Qurilma apparat identifikatori (HWID) — litsenziyani qurilmaga bog'lash uchun.
// Xotira tozalansa ham o'zgarmaydi (brauzerdagi tasodifiy saltdan farqli).
#[tauri::command]
fn machine_id() -> String {
    machine_uid::get().unwrap_or_default()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![machine_id])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
