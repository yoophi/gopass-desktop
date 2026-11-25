use gopass_core::EntryCatalog;
use std::{io, sync::Arc};

pub type Catalog = Arc<dyn EntryCatalog<Error = io::Error> + Send + Sync>;

#[tauri::command]
pub async fn list_entries(catalog: tauri::State<'_, Catalog>) -> Result<Vec<String>, String> {
    let catalog = Arc::clone(catalog.inner());
    tauri::async_runtime::spawn_blocking(move || {
        gopass_core::list_entries(catalog.as_ref()).map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| error.to_string())?
}
