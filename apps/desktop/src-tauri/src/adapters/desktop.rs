use serde_json::{json, Value};
use std::{fs, path::PathBuf, sync::Mutex};
use tauri::{
    menu::MenuBuilder, tray::TrayIconBuilder, AppHandle, Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

pub const DEFAULT_SHORTCUT: &str = "CommandOrControl+Shift+P";

#[derive(Default)]
pub struct DesktopState {
    active_shortcut: Mutex<Option<Shortcut>>,
    startup_error: Mutex<Option<String>>,
    #[cfg(target_os = "macos")]
    previous_app: Mutex<Option<i32>>,
}

fn shortcut_file(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|p| p.join("search-shortcut.txt"))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_search(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("search") {
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }
    #[cfg(target_os = "macos")]
    {
        let front = objc2_app_kit::NSWorkspace::sharedWorkspace().frontmostApplication();
        *app.state::<DesktopState>().previous_app.lock().unwrap() =
            front.map(|app| app.processIdentifier());
    }
    WebviewWindowBuilder::new(
        &app,
        "search",
        WebviewUrl::App("index.html?view=search".into()),
    )
    .title("빠른 검색")
    .inner_size(560., 410.)
    .center()
    .focused(true)
    .build()
    .and_then(|window| window.set_focus())
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn close_search(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("search") {
        window.destroy().map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    if let Some(pid) = app
        .state::<DesktopState>()
        .previous_app
        .lock()
        .unwrap()
        .take()
    {
        if let Some(previous) =
            objc2_app_kit::NSRunningApplication::runningApplicationWithProcessIdentifier(pid)
        {
            #[allow(deprecated)]
            previous.activateWithOptions(
                objc2_app_kit::NSApplicationActivationOptions::ActivateIgnoringOtherApps,
            );
        }
    }
    Ok(())
}

fn install_shortcut(app: &AppHandle, value: &str, persist: bool) -> Result<(), String> {
    let next = value.parse::<Shortcut>().map_err(|e| e.to_string())?;
    let state = app.state::<DesktopState>();
    let mut active = state.active_shortcut.lock().unwrap();
    if *active == Some(next) {
        return Ok(());
    }
    let file = shortcut_file(app)?;
    app.global_shortcut()
        .register(next)
        .map_err(|e| e.to_string())?;
    if persist {
        if let Err(e) =
            fs::create_dir_all(file.parent().unwrap()).and_then(|_| fs::write(&file, value))
        {
            let _ = app.global_shortcut().unregister(next);
            return Err(e.to_string());
        }
    }
    if let Some(old) = *active {
        app.global_shortcut()
            .unregister(old)
            .map_err(|e| e.to_string())?;
    }
    *active = Some(next);
    *state.startup_error.lock().unwrap() = None;
    Ok(())
}

#[tauri::command]
pub fn set_search_shortcut(app: AppHandle, value: String) -> Result<(), String> {
    install_shortcut(&app, &value, true)
}

#[tauri::command]
pub fn desktop_settings(app: AppHandle) -> Result<Value, String> {
    let shortcut =
        fs::read_to_string(shortcut_file(&app)?).unwrap_or_else(|_| DEFAULT_SHORTCUT.into());
    let state = app.state::<DesktopState>();
    let error = state.startup_error.lock().unwrap().clone();
    Ok(
        json!({"shortcut":shortcut,"error":error,"autostart":app.autolaunch().is_enabled().ok(),"version":app.package_info().version.to_string()}),
    )
}

#[tauri::command]
pub fn set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    let manager = app.autolaunch();
    (if enabled {
        manager.enable()
    } else {
        manager.disable()
    })
    .map_err(|e| e.to_string())
}

pub fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle();
    let shortcut = shortcut_file(handle)
        .ok()
        .and_then(|p| fs::read_to_string(p).ok())
        .unwrap_or_else(|| DEFAULT_SHORTCUT.into());
    if let Err(e) = install_shortcut(handle, &shortcut, false) {
        *app.state::<DesktopState>().startup_error.lock().unwrap() = Some(e);
    }
    let menu = MenuBuilder::new(app)
        .text("explorer", "탐색기")
        .text("search", "빠른 검색")
        .separator()
        .text("exit", "종료")
        .build()?;
    let mut tray = TrayIconBuilder::new().tooltip("gopass-desktop").menu(&menu);
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.on_menu_event(|app, event| match event.id().as_ref() {
        "explorer" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "search" => {
            tauri::async_runtime::spawn(open_search(app.clone()));
        }
        "exit" => app.exit(0),
        _ => (),
    })
    .build(app)?;
    Ok(())
}
