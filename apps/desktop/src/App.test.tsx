import { describe, expect, it } from 'vitest';
import {
  createNoteFromDraft,
  filterNotesByTag,
  getUniqueTags,
  parseTags,
  renderMarkdownToHtml,
  saveNoteToVault
} from './knowledge';

describe('knowledge vault', () => {
  it('creates a note with a stable markdown path', () => {
    const note = createNoteFromDraft('Project recap', '# Project recap\n\nNext steps', ['work', 'planning']);

    expect(note.title).toBe('Project recap');
    expect(note.path).toBe('notes/project-recap.md');
    expect(note.tags).toEqual(['work', 'planning']);
  });

  it('normalizes and filters tags for the vault', () => {
    const notes = [
      createNoteFromDraft('Launch plan', 'Ship the first build', ['Work', 'Planning']),
      createNoteFromDraft('People', 'Reminder for follow-ups', ['personal'])
    ];

    expect(parseTags(' Work, Planning, Q&A ')).toEqual(['work', 'planning', 'q&a']);
    expect(getUniqueTags(notes)).toEqual(['personal', 'planning', 'work']);
    expect(filterNotesByTag(notes, 'work', 'build')).toHaveLength(1);
  });

  it('saves note updates without duplicating records', () => {
    const base = createNoteFromDraft('Daily notes', 'Original content', ['daily']);
    const updated = { ...base, content: 'Updated content', tags: ['daily', 'work'] };

    expect(saveNoteToVault([base], updated)).toHaveLength(1);
    expect(saveNoteToVault([base], updated)[0].content).toBe('Updated content');
  });

  it('renders markdown links and lists as HTML', () => {
    const html = renderMarkdownToHtml('# Weekly brief\n\n- Review launch plan\n- Capture follow-ups\n\n[[Projects]]');

    expect(html).toContain('<h1>Weekly brief</h1>');
    expect(html).toContain('<li>Review launch plan</li>');
    expect(html).toContain('<a href="#note-Projects">Projects</a>');
  });
});
