export type KnowledgeNote = {
  id: string;
  title: string;
  path: string;
  tags: string[];
  content: string;
  updatedAt: string;
};

export const DEFAULT_KNOWLEDGE_NOTES: KnowledgeNote[] = [
  {
    id: 'ethans-note-area',
    title: "Ethan's note area",
    path: 'home/ethans-note-area.md',
    tags: ['root', 'strategy', 'ethan'],
    content: `# Ethan's note area

## Full strategy

This project is a clean-room, privacy-first reimplementation of the Sentient OS product idea for macOS, Windows, and Linux. The goal is to recreate the behavior and product experience without copying the original source code.

### Product pillars

1. Local-first memory: keep a Markdown knowledge base in a user-owned folder.
2. AI assistance without surveillance: opt-in sources and no telemetry by default.
3. OS-native automation: Sidekick with visible cursor, screenshots, typing, and app switching.
4. Approval-first actions: Double Tap drafts never send automatically; proactive cards only execute after explicit approval.
5. Flexible model routing: local models via Ollama / LM Studio / llama.cpp and hosted APIs via OpenAI, Anthropic, and OpenRouter.

### Core architecture

- Tauri desktop shell for cross-platform UI and packaging
- Rust core for settings, secrets, scheduler, and platform integration
- React + TypeScript for the app experience
- Local inference sidecar for on-device models
- Plain Markdown vault for knowledge graphs and note linking

### Platform decisions

- macOS: launchd, Keychain, Accessibility, Screen Recording
- Windows: Task Scheduler, Credential Manager, Windows UIA
- Linux: systemd timers / rtcwake, libsecret, X11-first automation

### Product flow

- Overnight analysis summarizes user-selected sources into a local knowledge base.
- A frontier model consolidates summaries into notes with tags and links.
- Morning cards surface renewals, deadlines, and suggested replies.
- Sidekick opens via a global hotkey and performs task automation with a visible stop button.
- Double Tap drafts responses in the user's voice using current context and writing style.

### Legal and safety

The original project uses AGPL-3.0 and a CLA/commercial licensing path. This codebase avoids copied implementation. The app is intentionally original and references the original only as a behavior guide, not as source material.

### Engrained product stance

- every source is opt-in
- all secrets live in OS keychains
- local files stay local unless the user chooses otherwise
- the software must feel like a private assistant, not a cloud surveillance system

[[Projects]]
[[People]]`,
    updatedAt: '2026-10-30T04:40:00Z'
  },
  {
    id: 'projects',
    title: 'Projects',
    path: 'work/projects.md',
    tags: ['work', 'planning'],
    content: '# Projects\n\n## Launch plan\n\n1. Define the knowledge vault path.\n2. Choose the default model provider.\n3. Capture daily actions for proactive follow-ups.\n\nThe knowledge base should help the user remember agreements and next steps.',
    updatedAt: '2026-10-29T21:05:00Z'
  },
  {
    id: 'people',
    title: 'People',
    path: 'people/contacts.md',
    tags: ['personal', 'context'],
    content: '# People\n\nKeep notes about relationships, preferences, and recurring commitments.\n\n## Priority contacts\n\n- Alex: prefers concise updates\n- Priya: likes multi-step plans in writing\n- Sam: sends calendar reminders for travel',
    updatedAt: '2026-10-29T21:09:00Z'
  }
];

export function buildNotePath(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';

  return `notes/${slug}.md`;
}

export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, '-');
}

export function parseTags(rawTags: string): string[] {
  return rawTags
    .split(',')
    .map((tag) => normalizeTag(tag))
    .filter(Boolean)
    .filter((tag, index, list) => list.indexOf(tag) === index);
}

export function getUniqueTags(notes: KnowledgeNote[]): string[] {
  const tags = new Set<string>();
  for (const note of notes) {
    for (const tag of note.tags) {
      const normalized = normalizeTag(tag);
      if (normalized) tags.add(normalized);
    }
  }
  return [...tags].sort();
}

export function filterNotesByTag(notes: KnowledgeNote[], activeTag: string, searchText: string): KnowledgeNote[] {
  const query = searchText.trim().toLowerCase();

  return notes.filter((note) => {
    const matchesTag = activeTag === 'all' || note.tags.some((tag) => normalizeTag(tag) === activeTag);
    if (!matchesTag) return false;

    if (!query) return true;

    const haystack = [note.title, note.path, note.content, note.tags.join(' ')].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

export function createNoteFromDraft(title: string, content: string, tags: string[] = ['draft']): KnowledgeNote {
  const safeTitle = title.trim() || 'Untitled note';
  return {
    id: `${safeTitle.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    title: safeTitle,
    path: buildNotePath(safeTitle),
    tags: tags.map(normalizeTag).filter(Boolean),
    content,
    updatedAt: new Date().toISOString()
  };
}

export function saveNoteToVault(notes: KnowledgeNote[], nextNote: KnowledgeNote): KnowledgeNote[] {
  const normalized = {
    ...nextNote,
    path: nextNote.path || buildNotePath(nextNote.title),
    tags: nextNote.tags.map(normalizeTag).filter(Boolean),
    title: nextNote.title.trim() || 'Untitled note',
    updatedAt: new Date().toISOString()
  };

  const next = [...notes];
  const index = next.findIndex((note) => note.id === normalized.id);

  if (index >= 0) {
    next[index] = normalized;
    return next;
  }

  return [normalized, ...next];
}

export function buildMarkdownDocument(note: KnowledgeNote): string {
  const safeTags = note.tags.length ? note.tags.map((tag) => `  - ${tag}`).join('\n') : '  - draft';

  return `---\ntitle: ${escapeYaml(note.title)}\npath: ${escapeYaml(note.path)}\ntags:\n${safeTags}\nupdatedAt: ${note.updatedAt}\n---\n\n${note.content.trim() || '# Untitled'}`;
}

export function readVaultFromStorage(raw: string | null): KnowledgeNote[] {
  if (!raw) return DEFAULT_KNOWLEDGE_NOTES;

  try {
    const parsed = JSON.parse(raw) as KnowledgeNote[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_KNOWLEDGE_NOTES;
  } catch {
    return DEFAULT_KNOWLEDGE_NOTES;
  }
}

export function renderMarkdownToHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let listBuffer: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const text = paragraphBuffer.join(' ');
    html.push(`<p>${formatInlineMarkdown(text)}</p>`);
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (listBuffer.length === 0) return;
    html.push(`<ul>${listBuffer.map((item) => `<li>${formatInlineMarkdown(item)}</li>`).join('')}</ul>`);
    listBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^#+\s+/.test(line)) {
      flushParagraph();
      flushList();
      const level = line.match(/^#+/)?.[0].length ?? 1;
      const content = line.replace(/^#+\s+/, '');
      html.push(`<h${Math.min(level, 6)}>${formatInlineMarkdown(content)}</h${Math.min(level, 6)}>`);
      continue;
    }

    if (/^-\s+/.test(line)) {
      flushParagraph();
      listBuffer.push(line.replace(/^-\s+/, ''));
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      flushParagraph();
      listBuffer.push(line.replace(/^\d+\.\s+/, ''));
      continue;
    }

    if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${formatInlineMarkdown(line.replace(/^>\s?/, ''))}</blockquote>`);
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushList();

  return html.join('');
}

function escapeYaml(value: string): string {
  return String(value).replace(/\\/g, '\\\\').replace(/\n/g, ' ');
}

function formatInlineMarkdown(text: string): string {
  return text
    .replace(/\[\[([^\]]+)\]\]/g, '<a href="#note-$1">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}
