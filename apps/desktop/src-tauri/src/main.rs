#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod adapters;

fn main() {
    let catalog: adapters::commands::Catalog = std::sync::Arc::new(gopass_cli::GopassCli);
    use adapters::desktop;
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .manage(desktop::DesktopState::default())
        .setup(desktop::setup)
        .manage(catalog)
        .invoke_handler(tauri::generate_handler![
            adapters::commands::list_entries,
            adapters::commands::read_entry,
            adapters::commands::copy_entry,
            adapters::commands::save_entry,
            adapters::commands::remove_entry,
            adapters::commands::entry_history,
            adapters::commands::list_mounts,
            adapters::commands::add_mount,
            adapters::commands::remove_mount,
            adapters::commands::sync_stores,
            adapters::commands::diagnose,
            adapters::commands::score_entry,
            desktop::open_search,
            desktop::close_search,
            desktop::desktop_settings,
            desktop::set_search_shortcut,
            desktop::pause_search_shortcut,
            desktop::open_releases,
            desktop::set_autostart
        ])
        .run(tauri::generate_context!())
        .expect("failed to run gopass-desktop");
}
