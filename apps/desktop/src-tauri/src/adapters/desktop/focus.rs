//! Capture the calling application before showing the search window.
#[cfg(target_os = "macos")]
mod platform {
    use objc2_app_kit::{
        NSApplication, NSApplicationActivationOptions, NSRunningApplication, NSWorkspace,
    };
    pub struct Target(i32);
    impl Target {
        pub fn current() -> Option<Self> {
            NSWorkspace::sharedWorkspace()
                .frontmostApplication()
                .map(|app| Self(app.processIdentifier()))
        }
        pub fn belongs_to_desktop(&self) -> bool {
            self.0 == std::process::id() as i32
        }
        pub fn restore(self) {
            let Some(previous) =
                NSRunningApplication::runningApplicationWithProcessIdentifier(self.0)
            else {
                return;
            };
            if objc2::available!(macos = 14.0) {
                let app = NSApplication::sharedApplication(objc2::MainThreadMarker::new().unwrap());
                app.yieldActivationToApplication(&previous);
                previous.activateFromApplication_options(
                    &NSRunningApplication::currentApplication(),
                    NSApplicationActivationOptions::empty(),
                );
            } else {
                #[allow(deprecated)]
                previous
                    .activateWithOptions(NSApplicationActivationOptions::ActivateIgnoringOtherApps);
            }
        }
    }
}

#[cfg(target_os = "windows")]
mod platform {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowThreadProcessId, SetForegroundWindow,
    };
    pub struct Target {
        window: usize,
        pid: u32,
    }
    impl Target {
        pub fn current() -> Option<Self> {
            let window = unsafe { GetForegroundWindow() };
            if window.is_null() {
                return None;
            }
            let mut pid = 0;
            unsafe { GetWindowThreadProcessId(window, &mut pid) };
            Some(Self {
                window: window as usize,
                pid,
            })
        }
        pub fn belongs_to_desktop(&self) -> bool {
            self.pid == std::process::id()
        }
        pub fn restore(self) {
            let mut current = 0;
            unsafe {
                GetWindowThreadProcessId(self.window as _, &mut current);
                if current != 0 && current == self.pid {
                    SetForegroundWindow(self.window as _);
                }
            }
        }
    }
}

#[cfg(target_os = "linux")]
mod platform {
    use x11rb::{
        connection::Connection,
        protocol::xproto::{AtomEnum, ClientMessageEvent, ConnectionExt, EventMask, Window},
        rust_connection::RustConnection,
        CURRENT_TIME,
    };

    fn property(conn: &RustConnection, window: Window, name: &[u8], kind: AtomEnum) -> Option<u32> {
        let atom = conn.intern_atom(true, name).ok()?.reply().ok()?.atom;
        let data = conn
            .get_property(false, window, atom, kind, 0, 1)
            .ok()?
            .reply()
            .ok()?;
        let mut values = data.value32()?;
        values.next()
    }

    pub struct Target {
        window: Window,
        root: Window,
        pid: Option<u32>,
    }
    impl Target {
        pub fn current() -> Option<Self> {
            let (conn, index) = x11rb::connect(None).ok()?;
            let root = conn.setup().roots[index].root;
            let window = property(&conn, root, b"_NET_ACTIVE_WINDOW", AtomEnum::WINDOW)?;
            if window == 0 {
                return None;
            }
            let pid = property(&conn, window, b"_NET_WM_PID", AtomEnum::CARDINAL);
            Some(Self { window, root, pid })
        }
        pub fn belongs_to_desktop(&self) -> bool {
            self.pid == Some(std::process::id())
        }
        pub fn restore(self) {
            let Ok((conn, _)) = x11rb::connect(None) else {
                return;
            };
            if property(&conn, self.window, b"_NET_WM_PID", AtomEnum::CARDINAL) != self.pid {
                return;
            }
            let Some(atom) = conn
                .intern_atom(true, b"_NET_ACTIVE_WINDOW")
                .ok()
                .and_then(|r| r.reply().ok())
            else {
                return;
            };
            let event =
                ClientMessageEvent::new(32, self.window, atom.atom, [2, CURRENT_TIME, 0, 0, 0]);
            let _ = conn.send_event(
                false,
                self.root,
                EventMask::SUBSTRUCTURE_NOTIFY | EventMask::SUBSTRUCTURE_REDIRECT,
                event,
            );
            let _ = conn.flush();
        }
    }
}

pub use platform::Target;
