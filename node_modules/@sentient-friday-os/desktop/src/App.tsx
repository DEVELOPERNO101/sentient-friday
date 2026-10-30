import { invoke } from '@tauri-apps/api/core';
import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_KNOWLEDGE_NOTES,
  KnowledgeNote,
  buildMarkdownDocument,
  createNoteFromDraft,
  filterNotesByTag,
  getUniqueTags,
  parseTags,
  readVaultFromStorage,
  renderMarkdownToHtml,
  saveNoteToVault
} from './knowledge';
import {
  RuntimeSettings,
  buildVaultFilePath,
  getRuntimeConfig,
  getRuntimeSettings,
  isTauriRuntime,
  resolveKnowledgeBasePath,
  saveRuntimeSettings
} from './runtime';

const STORAGE_KEY = 'sentient-knowledge-vault';

export default function App() {
  const [settings, setSettings] = useState<RuntimeSettings>(getRuntimeSettings());
  const [notes, setNotes] = useState<KnowledgeNote[]>(DEFAULT_KNOWLEDGE_NOTES);
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_KNOWLEDGE_NOTES[0].id);
  const [activeTag, setActiveTag] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftTags, setDraftTags] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(!getRuntimeSettings().onboardingComplete);
  const [showSettings, setShowSettings] = useState(false);
  const [vaultDirectoryInput, setVaultDirectoryInput] = useState(settings.knowledgeBaseDirectory);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const loaded = readVaultFromStorage(saved);
    setNotes(loaded);
    setSelectedId(loaded[0]?.id ?? DEFAULT_KNOWLEDGE_NOTES[0].id);

    const runtimeSettings = getRuntimeSettings();
    setSettings(runtimeSettings);
    setVaultDirectoryInput(runtimeSettings.knowledgeBaseDirectory);
    setShowOnboarding(!runtimeSettings.onboardingComplete);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const visibleNotes = useMemo(
    () => filterNotesByTag(notes, activeTag, searchText),
    [notes, activeTag, searchText]
  );

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? visibleNotes[0] ?? notes[0],
    [notes, selectedId, visibleNotes]
  );

  useEffect(() => {
    if (!selectedNote) return;
    setDraftTitle(selectedNote.title);
    setDraftContent(selectedNote.content);
    setDraftTags(selectedNote.tags.join(', '));
  }, [selectedNote]);

  const tags = useMemo(() => getUniqueTags(notes), [notes]);
  const runtimeConfig = useMemo(() => getRuntimeConfig(), []);

  const persistNoteToDisk = async (nextNote: KnowledgeNote) => {
    const vaultPath = nextNote.vaultPath ?? buildVaultFilePath(nextNote.path);
    const contents = buildMarkdownDocument(nextNote);

    if (isTauriRuntime()) {
      try {
        await invoke('write_note_file', { path: vaultPath, contents });
        return;
      } catch (error) {
        console.warn('Falling back to browser storage for vault write:', error);
      }
    }

    window.localStorage.setItem(`sentient-vault:${vaultPath}`, contents);
  };

  const applySettings = (nextSettings: RuntimeSettings) => {
    const saved = saveRuntimeSettings(nextSettings);
    setSettings(saved);
    setVaultDirectoryInput(saved.knowledgeBaseDirectory);
    setShowOnboarding(false);
    setShowSettings(false);
  };

  const onboardingComplete = () => {
    const nextSettings: RuntimeSettings = {
      ...settings,
      onboardingComplete: true,
      knowledgeBaseDirectory: vaultDirectoryInput.trim() || resolveKnowledgeBasePath(),
      mainModelProvider: settings.mainModelProvider,
      doubleTapModelProvider: settings.doubleTapModelProvider
    };
    applySettings(nextSettings);
  };

  const createNewNote = async () => {
    const fresh = createNoteFromDraft('New note', '# New note\n\nWrite something useful here.', ['draft']);
    const nextNotes = saveNoteToVault(notes, fresh);
    setNotes(nextNotes);
    setSelectedId(fresh.id);
    setActiveTag('all');
    await persistNoteToDisk(fresh);
  };

  const saveDraft = async () => {
    if (!selectedNote) return;

    const updated = {
      ...selectedNote,
      title: draftTitle.trim() || selectedNote.title,
      path: selectedNote.path || `notes/${draftTitle.trim().toLowerCase().replace(/\s+/g, '-')}.md`,
      content: draftContent,
      tags: parseTags(draftTags || 'updated'),
      updatedAt: new Date().toISOString(),
      vaultPath: buildVaultFilePath(selectedNote.path || `notes/${draftTitle.trim().toLowerCase().replace(/\s+/g, '-')}.md`)
    };

    const nextNotes = saveNoteToVault(notes, updated);
    setNotes(nextNotes);
    setSelectedId(updated.id);
    await persistNoteToDisk(updated);
  };

  const previewMarkup = selectedNote
    ? renderMarkdownToHtml(selectedNote.content)
    : renderMarkdownToHtml('# No note selected');

  const overviewStats = [
    { label: 'Notes', value: String(notes.length) },
    { label: 'Tags', value: String(tags.length) },
    { label: 'Auto-drafts', value: '3' },
    { label: 'Next wake', value: '03:00' }
  ];

  return (
    <main className="app-shell knowledge-shell">
      {showOnboarding && (
        <div className="onboarding-backdrop">
          <div className="onboarding-panel">
            <p className="eyebrow">Setup</p>
            <h3>Welcome to Sentient OS</h3>
            <p>
              Choose where your knowledge vault should live and confirm the default model stack.
            </p>

            <label className="field-label">
              <span>Knowledge vault folder</span>
              <input
                className="title-input"
                value={vaultDirectoryInput}
                onChange={(event) => setVaultDirectoryInput(event.target.value)}
              />
            </label>

            <label className="field-label">
              <span>Main model</span>
              <select
                className="title-input"
                value={settings.mainModelProvider}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    mainModelProvider: event.target.value as RuntimeSettings['mainModelProvider']
                  }))
                }
              >
                <option value="ollama">Ollama</option>
                <option value="llama-cpp">llama.cpp</option>
                <option value="lm-studio">LM Studio</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </label>

            <label className="field-label">
              <span>Double Tap model</span>
              <select
                className="title-input"
                value={settings.doubleTapModelProvider}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    doubleTapModelProvider: event.target.value as RuntimeSettings['doubleTapModelProvider']
                  }))
                }
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="ollama">Ollama</option>
                <option value="llama-cpp">llama.cpp</option>
                <option value="lm-studio">LM Studio</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </label>

            <div className="onboarding-actions">
              <button type="button" className="primary-button" onClick={onboardingComplete}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="settings-drawer">
          <div className="drawer-header">
            <h3>Vault settings</h3>
            <button type="button" className="ghost-button" onClick={() => setShowSettings(false)}>
              Close
            </button>
          </div>
          <label className="field-label">
            <span>Knowledge vault folder</span>
            <input
              className="title-input"
              value={vaultDirectoryInput}
              onChange={(event) => setVaultDirectoryInput(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              applySettings({
                ...settings,
                knowledgeBaseDirectory: vaultDirectoryInput.trim() || resolveKnowledgeBasePath()
              })
            }
          >
            Save settings
          </button>
        </div>
      )}

      <aside className="sidebar knowledge-sidebar">
        <div className="brand-block">
          <div className="brand-mark">S</div>
          <div>
            <p className="eyebrow">Private workspace</p>
            <h1>Sentient OS</h1>
          </div>
        </div>

        <button type="button" className="primary-button" onClick={() => void createNewNote()}>
          New note
        </button>

        <button type="button" className="ghost-button settings-button" onClick={() => setShowSettings(true)}>
          Settings
        </button>

        <label className="search-wrap">
          <span className="search-label">Search</span>
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Find notes..."
          />
        </label>

        <div className="tag-filter" aria-label="Tag filters">
          <button
            type="button"
            className={`tag-button ${activeTag === 'all' ? 'selected' : ''}`}
            onClick={() => setActiveTag('all')}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`tag-button ${activeTag === tag ? 'selected' : ''}`}
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="note-list" aria-label="Knowledge notes">
          {visibleNotes.length === 0 ? (
            <p className="empty-state">No notes match this filter.</p>
          ) : (
            visibleNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                className={`note-card ${selectedNote?.id === note.id ? 'active' : ''}`}
                onClick={() => setSelectedId(note.id)}
              >
                <span className="note-title">{note.title}</span>
                <span className="note-meta">{note.path}</span>
                <span className="note-tags">{note.tags.join(' · ')}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="content-panel knowledge-panel">
        <header className="header-row">
          <div>
            <p className="eyebrow">Private intelligence</p>
            <h2>Knowledge vault and viewer</h2>
          </div>
          <span className="status-pill">{visibleNotes.length} notes</span>
        </header>

        <div className="hero-panel">
          <div className="hero-copy">
            <p className="eyebrow">OS-ready</p>
            <h3>Quietly thinking ahead.</h3>
            <p>
              Keep your notes, follow-ups, and context organized in a local-first knowledge base
              that feels like a personal operating system, not a database.
            </p>
            <div className="runtime-summary">
              <span>{runtimeConfig.platform}</span>
              <strong>{settings.knowledgeBaseDirectory || runtimeConfig.knowledgeBaseDirectory}</strong>
            </div>
          </div>

          <div className="hero-actions">
            <button type="button" className="secondary-button" onClick={() => void createNewNote()}>
              Capture thought
            </button>
            <button type="button" className="ghost-button">
              Review morning brief
            </button>
          </div>
        </div>

        <div className="stats-grid">
          {overviewStats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>

        <div className="vault-grid">
          <div className="editor-card">
            <div className="card-header">
              <h3>Edit note</h3>
              <button type="button" className="secondary-button" onClick={() => void saveDraft()}>
                Save to vault
              </button>
            </div>

            <label className="field-label">
              <span>Title</span>
              <input
                className="title-input"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="Note title"
              />
            </label>

            <label className="field-label">
              <span>Tags</span>
              <input
                className="title-input"
                value={draftTags}
                onChange={(event) => setDraftTags(event.target.value)}
                placeholder="work, planning, personal"
              />
            </label>

            <label className="field-label">
              <span>Markdown</span>
              <textarea
                className="markdown-editor"
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                spellCheck={false}
              />
            </label>
          </div>

          <div className="preview-card">
            <div className="card-header">
              <h3>{selectedNote?.title ?? 'Note preview'}</h3>
              <span className="path-label">
                {selectedNote?.vaultPath ?? `${settings.knowledgeBaseDirectory}/${selectedNote?.path ?? 'notes/untitled.md'}`}
              </span>
            </div>

            <div className="meta-row">
              {selectedNote?.tags.map((tag) => (
                <button key={tag} type="button" className="chip" onClick={() => setActiveTag(tag)}>
                  #{tag}
                </button>
              ))}
            </div>

            <div className="vault-summary">
              <span>Updated {selectedNote ? new Date(selectedNote.updatedAt).toLocaleString() : '—'}</span>
              <span>Vault file: {selectedNote?.path ?? 'pending'}</span>
            </div>

            <article className="markdown-preview" dangerouslySetInnerHTML={{ __html: previewMarkup }} />
          </div>
        </div>
      </section>
    </main>
  );
}
