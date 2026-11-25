use gopass_core::EntryStore;
use std::{io, sync::Arc};

pub type Catalog = Arc<dyn EntryStore<Error = io::Error> + Send + Sync>;

#[tauri::command]
pub async fn list_entries(catalog: tauri::State<'_, Catalog>) -> Result<Vec<String>, String> {
    let catalog = Arc::clone(catalog.inner());
    tauri::async_runtime::spawn_blocking(move || {
        gopass_core::list_entries(catalog.as_ref()).map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| error.to_string())?
}

async fn call<T: Send + 'static>(
    catalog: tauri::State<'_, Catalog>,
    action: impl FnOnce(Catalog) -> io::Result<T> + Send + 'static,
) -> Result<T, String> {
    let store = Arc::clone(catalog.inner());
    tauri::async_runtime::spawn_blocking(move || action(store))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn read_entry(
    catalog: tauri::State<'_, Catalog>,
    path: String,
) -> Result<String, String> {
    call(catalog, move |s| s.read(&path)).await
}
#[tauri::command]
pub async fn copy_entry(catalog: tauri::State<'_, Catalog>, path: String) -> Result<(), String> {
    call(catalog, move |s| s.copy(&path)).await
}
#[tauri::command]
pub async fn save_entry(
    catalog: tauri::State<'_, Catalog>,
    path: String,
    value: String,
    editing: bool,
) -> Result<(), String> {
    call(catalog, move |s| s.save(&path, &value, editing)).await
}
#[tauri::command]
pub async fn remove_entry(catalog: tauri::State<'_, Catalog>, path: String) -> Result<(), String> {
    call(catalog, move |s| s.remove(&path)).await
}
#[tauri::command]
pub async fn entry_history(
    catalog: tauri::State<'_, Catalog>,
    path: String,
) -> Result<Vec<[String; 3]>, String> {
    call(catalog, move |s| s.history(&path)).await
}
