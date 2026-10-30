# OS support notes

This repository is designed to support the following target capabilities:

- macOS: menu bar, launchd-based scheduling, Apple permissions, and native accessibility integration
- Windows: tray app, Task Scheduler wake timers, Win32/UIA automation
- Linux: tray/AppIndicator, systemd timer wake orchestration, X11-first automation

The implementation is intentionally layered so OS-specific functionality remains behind a shared capability abstraction.
