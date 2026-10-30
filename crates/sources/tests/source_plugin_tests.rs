use sentient_sources::{SourceKind, SourcePlugin};

#[test]
fn builds_a_source_selection() {
    let plugin = SourcePlugin {
        id: "files".to_string(),
        name: "Files".to_string(),
        kind: SourceKind::Files,
        enabled: true,
        privacy_level: "local_only".to_string(),
    };

    let selection = plugin.into_selection();
    assert_eq!(selection.id, "files");
    assert_eq!(selection.kind, "Files");
    assert!(selection.enabled);
}
