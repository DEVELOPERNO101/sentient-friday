# Build matrix

This project targets the following desktop distribution formats:

- macOS: `.dmg` universal binary
- Windows: `.msi` and `.exe` installer flow
- Linux: `.AppImage`, `.deb`, and `.rpm`

## CI expectations

The GitHub Actions workflow runs:

- web build checks
- Rust formatting and workspace checks
- cross-platform Tauri packaging jobs for Linux, Windows, and macOS

## Notes

The Tauri bundle definition is intentionally platform-aware and conservative for the initial milestone. It is designed to be expanded with real signing, notarization, and per-platform icon assets as the project matures.
