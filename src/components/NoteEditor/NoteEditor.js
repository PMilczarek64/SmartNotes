import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import styles from './NoteEditor.module.scss';
import { usePouchActions } from '../../hooks/pouchHooks';

// selektor pomocniczy
const selectCardById = (id) => (state) =>
  (state.pouch?.cards || []).find((c) => c._id === id);

// util do tagów
const SPLIT_RE = /[,\s;#]+/g;
const norm = (t) => String(t).trim().replace(/\s+/g, ' ').toLowerCase();

export default function NoteEditor() {
  const { id } = useParams();
  const card = useSelector(selectCardById(id));
  const { updateCard, toggleCardFavorite, destroyCard } = usePouchActions();

  // Lokalne stany
  const [title, setTitle] = useState(card?.title || '');
  const [content, setContent] = useState(card?.content || '');
  const [tags, setTags] = useState(Array.isArray(card?.tags) ? card.tags : []);
  const [tagsInput, setTagsInput] = useState('');

  // AUTOSAVE toggle
  const [autosave, setAutosave] = useState(() => {
    try {
      const raw = localStorage.getItem('smartnotes.autosave');
      return raw ? raw === '1' : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('smartnotes.autosave', autosave ? '1' : '0');
    } catch {}
  }, [autosave]);

  // Debounce timer
  const saveTimer = useRef(null);

  const scheduleAutosave = useCallback(() => {
    if (!autosave || !card) return;

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateCard(card._id, { title, content, tags });
      console.log('[autosave] zapisano');
    }, 1000); // 5 sekund
  }, [autosave, card, title, content, tags, updateCard]);

  // Po zmianie karty
  useEffect(() => {
    setTitle(card?.title || '');
    setContent(card?.content || '');
    setTags(Array.isArray(card?.tags) ? card.tags : []);
    setTagsInput('');
    clearTimeout(saveTimer.current);
  }, [card?._id]);

  // Sprzątanie timera przy opuszczaniu strony / zmiany karty
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  // --- Parsowanie tagów ---
  const parsedToAdd = useMemo(() => {
    const parts = (tagsInput || '')
      .split(SPLIT_RE)
      .map(norm)
      .filter(Boolean);
    const unique = Array.from(new Set(parts));
    const notExisting = unique.filter((t) => !tags.map(norm).includes(t));
    return notExisting;
  }, [tagsInput, tags]);

  // Dodawanie tagów (natychmiast zapisuje)
const addTags = useCallback(() => {
  if (!card || parsedToAdd.length === 0) return;

  const next = Array.from(new Set([...tags.map(norm), ...parsedToAdd])).filter(Boolean);
  setTags(next);
  setTagsInput('');

  // Zapis NATYCHMIASTOWY
  updateCard(card._id, { tags: next });

  // reset debounce save — żeby to nie nadpisywało później
  clearTimeout(saveTimer.current);
}, [card, parsedToAdd, tags, updateCard]);


// Usuwanie tagu (natychmiast zapisuje)
const removeTag = useCallback((tag) => {
  if (!card) return;

  const next = (tags || []).filter((t) => norm(t) !== norm(tag));
  setTags(next);

  // Zapis NATYCHMIASTOWY
  updateCard(card._id, { tags: next });

  clearTimeout(saveTimer.current);
}, [card, tags, updateCard]);


  const saveNote = useCallback(() => {
    if (!card) return;
    clearTimeout(saveTimer.current);
    updateCard(card._id, { title, content, tags });
  }, [card, title, content, tags, updateCard]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    scheduleAutosave();
  };

  const handleContentChange = (v) => {
    setContent(v);
    scheduleAutosave();
  };

  if (!card) return <Navigate to="/" />;

  return (
    <section className={styles.editor}>
      <header className={styles.header}>
        {/* Switch Autosave */}
        <label className={styles.switch}>
          <input
            type="checkbox"
            className={styles.switchInput}
            checked={autosave}
            onChange={(e) => setAutosave(e.target.checked)}
            aria-label="Autosave"
          />
          <span className={styles.switchTrack}>
            <span className={styles.switchThumb} />
          </span>
          <span className={styles.switchText}>Autosave</span>
        </label>

        <div className={styles.meta}>
          <button
            onClick={() => toggleCardFavorite(card._id)}
            className={card.isFavorite ? styles.btnFavoriteActive : styles.btnFavorite}
          >
            {card.isFavorite ? '⭐ Unfavorite' : '☆ Favorite'}
          </button>
          <button className={styles.btnDanger} onClick={() => destroyCard(card._id)}>
            Delete
          </button>
          <button className={styles.btnPrimary} onClick={saveNote}>
            Save
          </button>
        </div>
      </header>

      <div className={styles.field}>
        <label className={styles.label}>Title</label>
        <input
          className={`${styles.input} ${styles.title}`}
          placeholder="Note title…"
          value={title}
          onChange={handleTitleChange}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Tagi</label>
        <div className={styles.row}>
          <input
            className={styles.input}
            placeholder="np. praca, #priorytet; 2025"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTags();
              }
            }}
          />
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={parsedToAdd.length === 0}
            onClick={addTags}
            title={parsedToAdd.length ? `Dodaj: ${parsedToAdd.join(', ')}` : 'Brak tagów do dodania'}
          >
            Dodaj
          </button>
        </div>

        <div className={styles.chips}>
          {Array.isArray(tags) && tags.length > 0 ? (
            tags.map((t) => (
              <span key={t} className={styles.chip}>
                <span>#{t}</span>
                <button
                  type="button"
                  className={styles.chipRemove}
                  aria-label={`Usuń ${t}`}
                  onClick={() => removeTag(t)}
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <span style={{ opacity: 0.7, fontSize: '.9rem' }}>Brak tagów</span>
          )}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Content</label>
        <div className={styles.quillBlock}>
          <ReactQuill value={content} onChange={handleContentChange} className={styles.quill} />
        </div>
      </div>

      <footer className={styles.footer}>
        <small>
          Created: {card.createdAt ? new Date(card.createdAt).toLocaleString() : '—'} • Updated:{' '}
          {card.updatedAt ? new Date(card.updatedAt).toLocaleString() : '—'}
        </small>
      </footer>
    </section>
  );
}
