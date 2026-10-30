<<<<<<< HEAD
# sentient-friday
=======
# Sentient Friday OS

This repository is a clean-room, cross-platform reimplementation of the behavior and product architecture described by the original Sentient OS project. It is not a port of that codebase and does not copy its implementation details.

## Project status

- Phase 1: architecture and scaffold
- Phase 2: knowledge vault and markdown viewer
- Phase 3: model-provider layer
- Phase 4: source plugins and analysis pipeline
- Phase 5: Double Tap drafting
- Phase 6: Sidekick computer use
- Phase 7: scheduler and proactive cards
- Phase 8: packaging and CI
- Current status: the project includes packaging and cross-platform CI scaffolding

## Monorepo layout

- apps/desktop — Tauri desktop shell and React UI
- apps/sidecar — local inference sidecar runtime
- packages/core — Rust settings, secrets, and state core
- packages/engine — analysis pipeline and knowledge orchestration
- packages/sources — source plugins and external data adapters
- packages/agent — Sidekick, Double Tap, and task orchestration
- packages/scheduler — wake scheduling and proactive run orchestration
- packages/models — provider interfaces and model routing
- packages/platform — hotkeys, tray/menu bar, automation, OS permissions
- packages/shared — common protocol and schema definitions

## Getting started

This project is a monorepo with a Tauri desktop shell and a React UI. The fastest way to run it is from a terminal in the project root.

### Prerequisites

- Node.js LTS
- Rust stable
- On Windows only: Visual Studio 2022 Build Tools with "Desktop development with C++" installed

### Cross-platform startup guide

Use a terminal in the repository root.

#### 1) Open the repo

```bash
cd /path/to/sentient-friday-os
```

#### 2) Install dependencies

```bash
npm install
```

#### 3) Run the web app (works anywhere)

```bash
npm run dev
```

This starts the Vite app in the browser for fast UI iteration.

#### 4) Run the desktop app (Tauri)

From the root:

```bash
npm run --workspace apps/desktop tauri:dev
```

Or from the desktop app folder:

```bash
cd apps/desktop
npm install
npm run tauri:dev
```

### Windows terminal prompts

If Node is not found in PowerShell, add it to PATH first:

```powershell
$env:Path += ";C:\Program Files\nodejs"
cd "C:\path\to\sentient-friday-os"
npm install
npm run --workspace apps/desktop tauri:dev
```

If you want to launch it directly from the desktop app directory:

```powershell
$env:Path += ";C:\Program Files\nodejs"
cd "C:\path\to\sentient-friday-os\apps\desktop"
npm install
npm run tauri:dev
```

### macOS / Linux terminal prompts

```bash
cd /path/to/sentient-friday-os
npm install
npm run --workspace apps/desktop tauri:dev
```

Or for the web preview only:

```bash
cd /path/to/sentient-friday-os
npm run dev
```

### If the desktop app does not open

- Make sure Node.js LTS is installed.
- Make sure Rust is installed.
- On Windows, install Visual Studio 2022 Build Tools and include the C++ workload.
- Restart the terminal and retry the `npm run tauri:dev` command.

### Useful commands

```bash
npm run dev
npm run build
npm run --workspace apps/desktop check
npm run --workspace apps/desktop test
npm run --workspace apps/desktop tauri:dev
```

## Legal note

The original project is AGPL-3.0 with a CLA and commercial licensing options. This repository is a separate implementation based only on behavioral design study and public documentation, and it avoids copying protected source code.





# Ethan's Note 
Procedure:


## no.1
$env:Path += ";C:\Program Files\nodejs"
cd "c:\Users\Ethan\Downloads\sentient-friday-os\apps\desktop"
npm install
npm run tauri:dev
enter

## Num.2 
npm run dev

done

>>>>>>> 1adbff7 (Initial commit)

### commit
cd "C:\Users\Ethan\Downloads\sentient-friday-os"

git checkout -B main
git add .
git commit -m "Initial project import"
git push -u origin main --force-with-lease
