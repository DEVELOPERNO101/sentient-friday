use std::fs;
use std::path::{Path, PathBuf};

pub fn ensure_vault_dir(path: &Path) -> std::io::Result<PathBuf> {
    if !path.exists() {
        fs::create_dir_all(path)?;
    }
    Ok(path.to_path_buf())
}

pub fn write_note(path: &Path, content: &str) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(path, content)
}
