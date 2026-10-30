#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PermissionState {
    Granted,
    Denied,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PlatformKind {
    Macos,
    Windows,
    Linux,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AutomationCursor {
    pub x: u32,
    pub y: u32,
    pub visible: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScreenCapture {
    pub path: String,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AutomationAction {
    CaptureScreen { label: String },
    MoveCursor { x: u32, y: u32 },
    Click { x: u32, y: u32 },
    TypeText { text: String },
    PressKey { key: String },
    FocusWindow { title: String },
    AttachFile { path: String },
    Stop,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AutomationSession {
    pub cursor: AutomationCursor,
    pub actions: Vec<AutomationAction>,
    pub stop_requested: bool,
}

impl AutomationSession {
    pub fn new() -> Self {
        Self {
            cursor: AutomationCursor {
                x: 0,
                y: 0,
                visible: true,
            },
            actions: Vec::new(),
            stop_requested: false,
        }
    }

    pub fn add_action(&mut self, action: AutomationAction) {
        self.actions.push(action);
    }

    pub fn request_stop(&mut self) {
        self.stop_requested = true;
        self.actions.push(AutomationAction::Stop);
    }
}

#[derive(Debug, Clone)]
pub struct HotkeyConfig {
    pub default_combo: String,
    pub platform: PlatformKind,
    pub enabled: bool,
}

impl HotkeyConfig {
    pub fn new(platform: PlatformKind) -> Self {
        let default_combo = match platform {
            PlatformKind::Macos => "Right-Cmd".to_string(),
            PlatformKind::Windows => "Ctrl+Space".to_string(),
            PlatformKind::Linux => "Ctrl+Space".to_string(),
        };

        Self {
            default_combo,
            platform,
            enabled: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{AutomationAction, AutomationSession};

    #[test]
    fn automation_session_tracks_actions_and_stop_signal() {
        let mut session = AutomationSession::new();
        session.add_action(AutomationAction::CaptureScreen {
            label: "initial-screenshot".to_string(),
        });
        session.add_action(AutomationAction::TypeText {
            text: "Drafting a follow-up".to_string(),
        });

        assert_eq!(session.actions.len(), 2);
        assert!(!session.stop_requested);

        session.request_stop();
        assert!(session.stop_requested);
        assert!(matches!(
            session.actions.last(),
            Some(AutomationAction::Stop)
        ));
    }
}
