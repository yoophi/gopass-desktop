use gopass_core::StoreAdmin;
use std::{io, sync::Arc};

pub type Catalog = Arc<dyn StoreAdmin<Error = io::Error> + Send + Sync>;

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

#[tauri::command]
pub async fn list_mounts(catalog: tauri::State<'_, Catalog>) -> Result<Vec<[String; 2]>, String> {
    call(catalog, |s| s.mounts()).await
}
#[tauri::command]
pub async fn add_mount(
    catalog: tauri::State<'_, Catalog>,
    name: String,
    directory: String,
) -> Result<(), String> {
    call(catalog, move |s| s.add_mount(&name, &directory)).await
}
#[tauri::command]
pub async fn remove_mount(catalog: tauri::State<'_, Catalog>, name: String) -> Result<(), String> {
    call(catalog, move |s| s.remove_mount(&name)).await
}
#[tauri::command]
pub async fn sync_stores(catalog: tauri::State<'_, Catalog>) -> Result<(), String> {
    call(catalog, |s| s.sync()).await
}
#[tauri::command]
pub async fn diagnose(catalog: tauri::State<'_, Catalog>) -> Result<Vec<[String; 2]>, String> {
    call(catalog, |s| {
        let mut stages = Vec::new();
        match s.version() {
            Ok(version) => stages.push([
                "CLI 실행".into(),
                version.lines().next().unwrap_or("성공").into(),
            ]),
            Err(e) => {
                stages.push(["CLI 실행 실패".into(), e.to_string()]);
                return Ok(stages);
            }
        }
        match s.list_paths() {
            Err(e) => stages.push(["저장소 접근 실패".into(), e.to_string()]),
            Ok(paths) => {
                stages.push(["저장소 접근".into(), format!("항목 {}개", paths.len())]);
                if let Some(path) = paths.first() {
                    match s.read(path) {
                        Ok(_) => stages.push(["복호화".into(), "성공".into()]),
                        Err(e) => stages.push(["복호화 실패 또는 인증 취소".into(), e.to_string()]),
                    }
                } else {
                    stages.push(["복호화".into(), "빈 저장소 · 확인할 항목 없음".into()]);
                }
            }
        }
        Ok(stages)
    })
    .await
}

#[tauri::command]
pub async fn score_entry(catalog: tauri::State<'_, Catalog>, path: String) -> Result<u8, String> {
    call(catalog, move |s| {
        s.read(&path)
            .map(|entry| gopass_core::health::password_score(&entry))
    })
    .await
}

#[tauri::command]
pub async fn generate_password(
    length: u32,
    capitals: bool,
    numerals: bool,
    symbols: bool,
    ambiguous: bool,
) -> Result<String, String> {
    let options = gopass_cli::PasswordOptions {
        length,
        capitals,
        numerals,
        symbols,
        ambiguous,
    };
    tauri::async_runtime::spawn_blocking(move || gopass_cli::generate_password(options))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}
