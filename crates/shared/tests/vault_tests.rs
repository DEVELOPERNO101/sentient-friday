use std::fs;

use sentient_shared::vault::{ensure_vault_dir, write_note};

#[test]
fn creates_vault_and_writes_note() {
    let temp = std::env::temp_dir().join(format!("sentient-vault-{}", std::process::id()));
    let _ = fs::remove_dir_all(&temp);

    let dir = ensure_vault_dir(&temp).unwrap();
    let note_path = dir.join("notes/test.md");
    write_note(&note_path, "# note\n\nhello").unwrap();

    assert!(note_path.exists());
    let contents = fs::read_to_string(note_path).unwrap();
    assert!(contents.contains("hello"));

    let _ = fs::remove_dir_all(&temp);
}
