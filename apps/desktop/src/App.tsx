import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_KNOWLEDGE_NOTES,
  KnowledgeNote,
  createNoteFromDraft,
  filterNotesByTag,
  getUniqueTags,
  parseTags,
  readVaultFromStorage,
  renderMarkdownToHtml,
  saveNoteToVault
} from './knowledge';

const STORAGE_KEY = 'sentient-knowledge-vault';

export default function App() {
  const [notes, setNotes] = useState<KnowledgeNote[]>(DEFAULT_KNOWLEDGE_NOTES);
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_KNOWLEDGE_NOTES[0].id);
  const [activeTag, setActiveTag] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftTags, setDraftTags] = useState('');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const loaded = readVaultFromStorage(saved);
    setNotes(loaded);
    setSelectedId(loaded[0]?.id ?? DEFAULT_KNOWLEDGE_NOTES[0].id);
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

  const createNewNote = () => {
    const fresh = createNoteFromDraft('New note', '# New note\n\nWrite something useful here.', ['draft']);
    setNotes((current) => saveNoteToVault(current, fresh));
    setSelectedId(fresh.id);
    setActiveTag('all');
  };

  const saveDraft = () => {
    if (!selectedNote) return;

    const updated = {
      ...selectedNote,
      title: draftTitle.trim() || selectedNote.title,
      path: selectedNote.path || `notes/${draftTitle.trim().toLowerCase().replace(/\s+/g, '-')}.md`,
      content: draftContent,
      tags: parseTags(draftTags || 'updated'),
      updatedAt: new Date().toISOString()
    };

    setNotes((current) => saveNoteToVault(current, updated));
    setSelectedId(updated.id);
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
      <aside className="sidebar knowledge-sidebar">
        <div className="brand-block">
          <div className="brand-mark">S</div>
          <div>
            <p className="eyebrow">Private workspace</p>
            <h1>Sentient OS</h1>
          </div>
        </div>

        <button type="button" className="primary-button" onClick={createNewNote}>
          New note
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
          </div>

          <div className="hero-actions">
            <button type="button" className="secondary-button" onClick={createNewNote}>
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
              <button type="button" className="secondary-button" onClick={saveDraft}>
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
              <span className="path-label">{selectedNote?.path ?? 'notes/untitled.md'}</span>
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

            <article
              className="markdown-preview"
              dangerouslySetInnerHTML={{ __html: previewMarkup }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
