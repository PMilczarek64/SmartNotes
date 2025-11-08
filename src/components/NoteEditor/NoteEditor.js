// src/components/NoteEditor/NoteEditor.js
import React, { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import styles from './NoteEditor.module.scss';
import { usePouchActions } from '../../hooks/pouchHooks';

// selektor pomocniczy
const selectCardById = (id) => (state) =>
  (state.pouch?.cards || []).find((c) => c._id === id);

export default function NoteEditor() {
  const { id } = useParams();
  const card = useSelector(selectCardById(id));
  const { updateCard, toggleCardFavorite, destroyCard } = usePouchActions();

  // Lokalne stany edytora (hooki zawsze wywołane)
  const [title, setTitle] = useState(card?.title || '');
  const [content, setContent] = useState(card?.content || '');
  const [tagsInput, setTagsInput] = useState((card?.tags || []).join(', '));

  // Gdy karta się zmieni (np. po wejściu na stronę), zsynchronizuj pola
  useEffect(() => {
    setTitle(card?.title || '');
    setContent(card?.content || '');
    setTagsInput((card?.tags || []).join(', '));
  }, [card?._id]); // zmiana ID karty = przeładowanie pól

  // Debounce zapisu tytułu
  useEffect(() => {
    if (!card) return;
    const t = setTimeout(() => {
      if (title !== (card.title || '')) {
        updateCard(card._id, { title });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [title, card, updateCard]);

  // Debounce zapisu treści
  useEffect(() => {
    if (!card) return;
    const t = setTimeout(() => {
      if (content !== (card.content || '')) {
        updateCard(card._id, { content });
      }
    }, 600);
    return () => clearTimeout(t);
  }, [content, card, updateCard]);

  const saveTags = () => {
    if (!card) return;
    const tags = tagsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updateCard(card._id, { tags });
  };

  // Teraz możemy warunkowo wyjść — hooki zostały wywołane wcześniej
  if (!card) return <Navigate to="/" />;

  return (
    <section className={styles.editor}>
      <header className={styles.header}>
        <Link to={`/list/${card.listId}`} className={styles.back}>
          &larr; Back
        </Link>

        <div className={styles.meta}>
          <button onClick={() => toggleCardFavorite(card._id)}>
            {card.isFavorite ? '⭐ Unfavorite' : '☆ Favorite'}
          </button>
          <button className={styles.delete} onClick={() => destroyCard(card._id)}>
            Delete
          </button>
        </div>
      </header>

      <input
        className={styles.title}
        placeholder="Note title…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className={styles.tagsRow}>
        <input
          className={styles.tags}
          placeholder="tags (comma separated)…"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          onBlur={saveTags}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), saveTags())}
        />
      </div>

      <ReactQuill value={content} onChange={setContent} className={styles.quill} />

      <footer className={styles.footer}>
        <small>
          Created: {card.createdAt ? new Date(card.createdAt).toLocaleString() : '—'}
          {' • '}
          Updated: {card.updatedAt ? new Date(card.updatedAt).toLocaleString() : '—'}
        </small>
      </footer>
    </section>
  );
}
