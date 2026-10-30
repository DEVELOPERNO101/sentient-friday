# Architecture for a Cross-Platform Sentient OS Clone

## Scope and legal boundaries

This document is a clean-room architecture proposal based on the behavior and design intent of the original Sentient OS project, not a port of its code. The original project is AGPL-3.0 licensed with a CLA and separate commercial options; our implementation must remain independent, avoid copied code, and preserve original source as behavioral reference only.

This design intentionally follows the product behavior described in the original README, security policy, and the macOS docs for Engine, Scheduling, Knowledge Base, and Native Computer Use. The goal is to reproduce the product experience on macOS, Windows, and Linux without copying implementation details.

## Product behavior to reproduce

From the original project, the core user-facing behaviors are:

- Overnight analysis: read selected local sources, summarize them with an on-device model, then consolidate them into a shared knowledge base through a chosen frontier model.
- Knowledge ownership: store the knowledge base as ordinary Markdown files in a user-owned folder, with a viewer that exposes graph-like navigation and links between notes.
- Sidekick: a global hotkey or floating menu/overlay opens a task prompt that can take voice or text input, use a visible cursor, click/type, attach files, and move across apps.
- Double Tap: a hotkey can draft an unsent reply in the user’s voice using the current conversation context, the knowledge base, and an editable writing-style file.
- Proactive cards: detect likely next actions in the morning and surface draft replies or tasks for approval before anything executes.
- Model choice: local inference backends (LM Studio, Ollama, llama.cpp OpenAI-compatible endpoints) and hosted providers (OpenAI, Anthropic, OpenRouter); configured separately for the main model and for Double Tap.
- Optional MCP: expose the knowledge base to other AI apps through an encrypted remote mirror, if enabled.

## Research summary

### README and product framing

The original README describes Sentient OS as a personal AI that is:

- local-first and privacy-oriented,
- grounded in the user’s real apps and files,
- able to prepare work overnight,
- able to speak or act in the user’s own apps with a separate cursor,
- able to draft replies in the user’s voice without sending anything automatically,
- and able to maintain a personal knowledge base that users can read and edit.

The messaging emphasizes ordinary Markdown knowledge, local analysis, user-owned data, and user approval before actions execute.

### Security and privacy boundary

The original SECURITY.md makes the core trust boundary explicit:

- local sources are analyzed locally, not uploaded wholesale,
- a chosen frontier model may be hosted, but it is separate from the local analysis pipeline,
- knowledge files remain ordinary files the user owns,
- writing samples are a separate one-time snapshot,
- optional sharing adds encryption before remote transmission,
- permission gates and screen-automation limits are treated as explicit, user-granted capabilities.

This is the correct product stance for the reimplementation: local-first defaults, source opt-in, explicit permissions, and no hidden telemetry by default.

### Engine design

The macOS Engine docs describe a local first-pass summarization layer based on a LiteRT-LM wrapper around Gemma 4 E4B, with deterministic PII filters, strict JSON parsing, and fail-closed classification (survivor / junk / sensitive).

Important behavioral features from the engine docs:

- local source analysis runs on-device,
- a chosen frontier model consolidates summaries into knowledge,
- safety filters reject unsafe or private data before it becomes memory,
- output is structured and enforced with strict validation,
- the model is stored under a user-managed app support path and is downloadable during onboarding.

This points to a cross-platform architecture where local summarization is a separate stage from general reasoning and knowledge synthesis.

### Scheduling and wake logic

The scheduling docs describe a 3 AM overnight pipeline with a privileged helper on macOS, launched at login and armed to wake the system. The app uses a serial processing coordinator and notifies the user the next morning with caution states if analysis failed.

Cross-platform equivalents:

- macOS: launchd + LaunchDaemon helper + wake scheduling,
- Windows: Task Scheduler + wake timers + service/daemon helper,
- Linux: systemd timers + rtcwake or suspend/wake orchestration + user service.

The core principle is the same: scheduling is a privileged OS-managed mechanism that wakes the machine, but the analysis pipeline itself remains app-owned and resumable.

### Knowledge base and vault behavior

The knowledge docs strongly suggest the product’s key principle: turn personal context into ordinary Markdown notes with explicit links, not proprietary data stores. The system:

- writes a fresh staging directory,
- runs a knowledge-generation prompt against the corpus,
- atomically swaps the new folder into place,
- preserves user edits and freshness checks,
- merges updates surgically rather than rebuilding everything,
- handles resume after usage-limit errors.

This becomes the foundation of the cross-platform knowledge core: a plain Markdown folder with an editor/reader view and discoverable note graph.

### Native computer use and Sidekick

The computer-use docs describe a generic interaction layer grounded in a signed native helper, with explicit OS permissions and a shared task orchestrator. The user sees a single task lock and a single STOP path. The app uses a separate cursor and requires verification before claiming success.

The relevant pattern is: OS-specific automation adapters expose a consistent action interface to the agent runtime, while the agent runtime decides when to click, type, read, or attach files. The cross-platform implementation should keep the automation backend behind a capability abstraction.

## Architecture proposal

### 1) Product architecture

We will build a clean-room implementation with the following layers:

- Tauri application shell
  - cross-platform desktop bootstrap,
  - tray/menu bar/notch-like overlay host,
  - React + TypeScript UI,
  - OS event bridge for hotkeys, tray actions, and app lifecycle.

- Rust core services
  - settings and secrets storage,
  - scheduler state,
  - source-plugin orchestration,
  - knowledge-base writer/reader,
  - provider routing and model config,
  - task coordination and permission checks,
  - file operations and local state management.

- Local inference sidecar
  - llama.cpp or Ollama-managed local model runtime,
  - GPU allocation per OS,
  - model download and validation,
  - OpenAI-compatible endpoint bridge for local APIs.

- Agent runtime
  - sidekick task orchestration,
  - Double Tap drafting flow,
  - proactive card generation,
  - tool use abstraction for computer actions and file operations.

### 2) Module layout

Recommended monorepo structure:

- apps/
  - desktop/ (Tauri app shell)
  - sidecar/ (local inference worker)

- packages/
  - ui/ (React + TypeScript screens)
  - core/ (Rust core crate; settings, secret store, workspace, state)
  - engine/ (analysis orchestration)
  - sources/ (source adapters and parsing)
  - agent/ (task runtime, tool execution, sidekick, Double Tap)
  - scheduler/ (overnight wake scheduling and job orchestration)
  - models/ (provider abstractions and prompt contracts)
  - platform/ (OS-specific adapters, permissions, automation, tray/hotkeys)
  - shared/ (common JSON schemas, types, protocol)

Note: if the app is kept simpler for phase 1, the crate boundaries may be flattened into the same workspace, but the internal boundaries should still map directly to the above design.

### 3) Data flow

A practical data pipeline is:

1. Source selection
   - the user chooses enabled local and remote sources,
   - each source is represented by a plugin that yields structured items.

2. Local triage and summarization
   - each source item is passed through a permissive local summarizer,
   - secret-sensitive data and junk content are filtered out at the local stage,
   - retained summaries are stored in a normalized corpus format.

3. Knowledge consolidation
   - a chosen frontier model reads the corpus and writes Markdown notes into a staging folder,
   - the vault writer performs atomic swap to the live knowledge path,
   - the live folder remains ordinary user-owned Markdown files.

4. Usage and task execution
   - Sidekick / Double Tap / proactive cards read from the live vault, screen context, and task memory,
   - tasks do not execute without an explicit user confirmation path,
   - execution is routed through a shared tool layer.

### 4) Source-plugin model

Every source should be represented by a plugin interface with:

- capability declaration (files, messages, mail, calendar, browser, screenshots)
- permissions required per OS,
- data extraction contract,
- summarization output format,
- optional user-facing source selection and trust metadata.

Example source families:

- Local files and text
- Notes and documents
- Mail and calendars
- Messages and chat histories
- Browser/clipboard snapshots
- Screenshots and capture logs

Platform-specific rules:

- macOS: system connectors can read Apple Mail, Notes, Messages, Calendar as allowed by permissions.
- Windows: sources are primarily user-selected folders, saved screenshots, text/Markdown files, Outlook/Thunderbird data when configured, and calendar data through ICS/CalDAV.
- Linux: files, saved screenshots, Markdown notes, mailboxes, and user-selected calendar sources via ICS or IMAP.

If a source cannot exist on a target OS, the plugin simply exposes “unsupported” and is hidden from onboarding.

### 5) Knowledge-base design

Knowledge storage should be plain Markdown under a user-owned directory:

- macOS: ~/Sentient OS - Knowledge Base/
- Windows: %USERPROFILE%\Sentient OS - Knowledge Base\
- Linux: ~/Sentient OS - Knowledge Base/

Required features:

- ordinary Markdown files, no custom binary format,
- linkable notes using wiki-style or standard Markdown links,
- a viewer window with note list and relationships,
- a graph or constellation view for note connectivity,
- user-editable notes without locking the app to a proprietary format,
- atomic write model for staged updates,
- metadata support for source provenance and trust stages.

The knowledge writer should follow the same semantics as the original product: create a staging directory, check freshness before swapping, and preserve user edits when they happen during a write.

### 6) Sidekick and computer-use design

This is the highest-risk behavior to reproduce and the most OS-specific.

Architecture:

- unified task orchestration layer,
- OS automation adapters behind one capability interface,
- screenshot and UI-state abstraction,
- action verification before reporting success,
- global key capture and overlay UI,
- separate STOP and cancel semantics.

Capability abstraction:

- capture_screen()
- find_element()
- click()
- type_text()
- keypress()
- move_cursor()
- read_text()
- attach_file()
- switch_app()
- wait_for_ui()

Backends:

- macOS: Accessibility + Screen Recording + Apple Events + native helper-based automation
- Windows: UI Automation + Win32 input simulation + accessibility hooks
- Linux: X11 first, Wayland as limited capability mode

The automation runtime must enforce permission gating and user-visible consent. We should treat any agent action as a privileged workflow requiring explicit user approval at task start or permission grant.

### 7) Double Tap design

Double Tap should be a separate runtime from Sidekick, with its own provider configuration and own model selection.

Flow:

- listen for hotkey on focused field,
- capture current screen or active text context,
- gather conversation context from the focused app,
- read knowledge base plus writing-style examples,
- draft a response in the user’s voice,
- render draft into the active text field without sending,
- allow user review, edit, and send manually.

This should not mutate the remote state; the draft remains local until user action.

Required modules:

- active-app context capture
- writing-style snapshot manager
- prompt builder for conversation + knowledge + examples
- provider timeout and retry logic
- insertion into focused input field

### 8) Proactive suggestions design

Morning suggestions should be generated as a separate approval workflow, not automatic execution.

The pipeline:

- scheduled analysis runs overnight,
- summarization and knowledge updates complete,
- cards are generated from discovered actions, deadlines, renewals, and outstanding follow-ups,
- the user reviews each card and approves before any side effect runs,
- actions execute through the same agent runtime as Sidekick, but only after explicit approval.

This keeps the product useful without creating dangerous automation by default.

### 9) Model-provider abstraction

Provide a provider abstraction that supports both local and hosted endpoints.

Provider families:

- local
  - llama.cpp
  - Ollama
  - LM Studio
  - OpenAI-compatible responses and chat completions endpoints
- hosted
  - OpenAI
  - Anthropic
  - OpenRouter

Required base capabilities:

- text generation
- image or multimodal input
- tool-calling support when available
- streaming support for live UI
- cost metadata and provider health checks
- per-feature provider selection (main model vs Double Tap model)

The runtime should also support provider-specific routing for:

- overnight analysis
- knowledge synthesis
- Sidekick reasoning
- proactive card generation
- Double Tap drafting

### 10) Security and privacy architecture

The product should be designed to default to privacy and explicit user control:

- no telemetry by default
- all source plugins opt-in
- secrets stored in OS keychains
- no hidden cross-site tracking or analytics
- optional MCP mirror encrypts data before upload
- user-owned folder remains the primary source of truth
- permission prompts are OS-native and per-feature

This matches the original safety stance and makes cross-platform compliance and user trust easier to maintain.

### 11) Scheduling and wake architecture

Cross-platform scheduling requirements:

- macOS: launchd + privileged helper + wake timers
- Windows: Task Scheduler + power wake timers + service helper
- Linux: systemd timer + rtcwake or suspend/wake helper

The scheduler should:

- arm the next overnight run,
- check system power state,
- set battery and thermal constraints,
- persist partial progress and checkpoint resume state,
- avoid running when unplugged if configured,
- surface failures in a morning caution state,
- avoid executing agent actions until user approval.

### 12) UI architecture

The interface should include:

- main dashboard or home view
- knowledge browser
- source selection screen
- model configuration screen
- Sidekick overlay or floating window
- proactive card stream
- installer and permissions onboarding
- tray/menu bar host and hotkey configuration

The UI layer should remain thin and render from state; task execution and model operations remain in the Rust/core and sidecar layers.

## Proposed implementation phases

Build order, as requested:

1. ARCHITECTURE.md and project scaffold
   - workspace layout,
   - monorepo boundaries,
   - shared contracts,
   - initial Tauri shell and config,
   - placeholder modules for engine, agent, scheduler, and sources.

2. Knowledge base + Markdown viewer
   - plain Markdown vault,
   - note writer and atomic swap semantics,
   - link graph / reader view,
   - source provenance metadata,
   - user-edit preservation logic.

3. Model-provider layer
   - provider interface,
   - local inference adapters,
   - hosted API adapters,
   - provider selection UI and configuration storage.

4. Source plugins + analysis pipeline
   - local source adapters,
   - local summarizer,
   - triage and PII filters,
   - overnight pipeline orchestration.

5. Double Tap
   - context extraction,
   - writing-style file support,
   - draft insertion flow,
   - provider-specific Double Tap configs.

6. Sidekick computer use
   - hotkey and overlay,
   - screen capture and action layer,
   - permission flows,
   - STOP/cancel semantics.

7. Scheduler and proactive cards
   - overnight wake scheduling,
   - proactive summarization and card generation,
   - approval-before-action flow.

8. Packaging and CI
   - macOS .dmg,
   - Windows .msi/.exe,
   - Linux .AppImage/.deb/.rpm,
   - GitHub Actions build matrix for all targets.

## Key risks and design decisions

- Cross-platform computer use is the biggest engineering risk. The app should use OS-native accessibility automation where possible and degrade gracefully when a target OS does not provide the necessary capability.
- Local inference cannot be identical across platforms. We should optimize the default runtime per OS while preserving the same abstractions.
- We should keep the knowledge layer simple and observable. Users own the notes; if a future feature needs more structure, it should be layered atop Markdown, not as a separate proprietary format.
- We should avoid any design that requires a server-side copy of the user’s private knowledge as the primary store. Local Markdown folder remains the ground truth.

## Short conclusion

The clean-room version of Sentient OS should behave like a personal AI operating system built around four pillars: local source understanding, ordinary Markdown knowledge ownership, explicit user approval for actions, and a cross-platform automation layer that keeps a visible user interface and a clear permission boundary.

The strongest implementation strategy is Tauri + Rust core + React UI with a local inference sidecar and OS-specific adapters for hotkeys, automation, tray/menu-bar surfaces, and wake/scheduler orchestration. That architecture matches the original product’s behavior, keeps the implementation portable, and remains compatible with the project’s privacy-first design.

## Proposed next step

Before any implementation begins, confirm the project direction: the recommended path is Tauri + Rust + React + sidecar local inference, with the first milestone dedicated to architecture scaffolding and the knowledge-base writer. If that direction is accepted, the next step is to scaffold the monorepo and implement Phase 1 only.
