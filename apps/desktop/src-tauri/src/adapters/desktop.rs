mod focus;

use serde_json::{json, Value};
use std::{fs, path::PathBuf, sync::Mutex};
use tauri::{
    menu::{Menu, MenuBuilder, SubmenuBuilder},
    tray::TrayIconBuilder,
    AppHandle, Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcut, Shortcut, ShortcutState};

pub const DEFAULT_SHORTCUT: &str = "CommandOrControl+Shift+P";

#[derive(Default)]
pub struct DesktopState {
    active_shortcut: Mutex<Option<Shortcut>>,
    startup_error: Mutex<Option<String>>,
    previous_app: Mutex<Option<focus::Target>>,
}

fn shortcut_file(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|p| p.join("search-shortcut.txt"))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_search(app: AppHandle) -> Result<(), String> {
    let existing = app.get_webview_window("search");
    let (sender, mut receiver) = tauri::async_runtime::channel(1);
    app.run_on_main_thread(move || {
        let _ = sender.try_send(focus::Target::current());
    })
    .map_err(|e| e.to_string())?;
    if let Some(front) = receiver.recv().await.flatten() {
        if existing.is_none() || !front.belongs_to_desktop() {
            *app.state::<DesktopState>().previous_app.lock().unwrap() = Some(front);
        }
    }
    #[cfg(target_os = "macos")]
    app.show().map_err(|e| e.to_string())?;
    if let Some(window) = existing {
        window
            .show()
            .and_then(|_| window.set_focus())
            .map_err(|e| e.to_string())?;
        return Ok(());
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
    if let Some(previous) = app
        .state::<DesktopState>()
        .previous_app
        .lock()
        .unwrap()
        .take()
    {
        app.run_on_main_thread(move || previous.restore())
            .map_err(|e| e.to_string())?;
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
    let shortcuts = app
        .try_state::<GlobalShortcut<tauri::Wry>>()
        .ok_or_else(|| "이 환경에서 전역 단축키를 사용할 수 없습니다.".to_string())?;
    shortcuts.register(next).map_err(|e| e.to_string())?;
    if persist {
        if let Err(e) =
            fs::create_dir_all(file.parent().unwrap()).and_then(|_| fs::write(&file, value))
        {
            let _ = shortcuts.unregister(next);
            return Err(e.to_string());
        }
    }
    if let Some(old) = *active {
        shortcuts.unregister(old).map_err(|e| e.to_string())?;
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
    let plugin = tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, _, event| {
            if event.state == ShortcutState::Pressed {
                tauri::async_runtime::spawn(open_search(app.clone()));
            }
        })
        .build();
    let registration = handle
        .plugin(plugin)
        .map_err(|e| e.to_string())
        .and_then(|_| install_shortcut(handle, &shortcut, false));
    if let Err(e) = registration {
        *app.state::<DesktopState>().startup_error.lock().unwrap() = Some(e);
    }
    let menu = MenuBuilder::new(app)
        .text("explorer", "탐색기")
        .text("search", "빠른 검색")
        .separator()
        .text("exit", "종료")
        .build()?;
    let navigation = SubmenuBuilder::new(app, "저장소")
        .text("explorer", "탐색기")
        .text("search", "빠른 검색")
        .build()?;
    let app_menu = match app.menu() {
        Some(menu) => menu,
        None => Menu::default(handle)?,
    };
    app_menu.append(&navigation)?;
    app.set_menu(app_menu)?;
    app.on_menu_event(|app, event| match event.id().as_ref() {
        "explorer" => {
            #[cfg(target_os = "macos")]
            let _ = app.show();
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
    });
    let mut tray = TrayIconBuilder::with_id("desktop")
        .tooltip("gopass-desktop")
        .menu(&menu);
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    let tray = tray.build(app);
    if tray.is_ok() {
        if let Some(main) = app.get_webview_window("main") {
            let window = main.clone();
            main.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.eval("window.dispatchEvent(new Event('pagehide'))");
                    let _ = window.hide();
                }
            });
        }
    }
    Ok(())
}

#[tauri::command]
pub fn open_releases(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_url(
            "https://github.com/yoophi/gopass-desktop/releases/latest",
            None::<&str>,
        )
        .map_err(|e| e.to_string())
}
