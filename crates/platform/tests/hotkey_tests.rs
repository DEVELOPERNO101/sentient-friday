use sentient_platform::{HotkeyConfig, PlatformKind};

#[test]
fn platform_defaults_use_correct_hotkeys() {
    let mac = HotkeyConfig::new(PlatformKind::Macos);
    let win = HotkeyConfig::new(PlatformKind::Windows);
    let linux = HotkeyConfig::new(PlatformKind::Linux);

    assert_eq!(mac.default_combo, "Right-Cmd");
    assert_eq!(win.default_combo, "Ctrl+Space");
    assert_eq!(linux.default_combo, "Ctrl+Space");
}
