#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod adapters;

fn main() {
    let catalog: adapters::commands::Catalog = std::sync::Arc::new(gopass_cli::GopassCli);
    tauri::Builder::default()
        .manage(catalog)
        .invoke_handler(tauri::generate_handler![adapters::commands::list_entries])
        .run(tauri::generate_context!())
        .expect("failed to run gopass-desktop");
}
