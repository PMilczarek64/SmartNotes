// src/components/Column/Column.js
import React, { useEffect, useRef, useState } from 'react';
import styles from './Column.module.scss';
import CardForm from '../CardForm/Cardform';
import Card from '../Card/Card';
import { usePouchCards, usePouchActions } from '../../hooks/pouchHooks';
import { useSelector, useDispatch } from 'react-redux';
import { selectSearchKey } from '../../redux/searchStringRedux';
import { pouchUpsertDoc } from '../../redux/pouchReducer';

const Column = ({ columnId, listId, title, icon }) => {
  const cards = usePouchCards({ listId, categoryId: columnId });

  // tryb wyszukiwania – ukrywamy puste kolumny i formularz dodawania
  const searchKey = useSelector(selectSearchKey);
  const isSearching = !!(searchKey && searchKey.trim().length);

  const dispatch = useDispatch();
  const { destroyCategory, updateColumn } = usePouchActions();

  // ====== Inline edit nazwy kolumny ======
  const [isEditing, setIsEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(title || '');
  const inputRef = useRef(null);

  // gdy props title się zmieni (np. z Pouch changes), zsynchronizuj
  useEffect(() => {
    if (!isEditing) setLocalTitle(title || '');
  }, [title, isEditing]);

  // autofocus po wejściu w edycję
  useEffect(() => {
    if (isEditing && inputRef.current) inputRef.current.focus();
  }, [isEditing]);

  const startEdit = () => {
    setLocalTitle(title || '');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setLocalTitle(title || '');
    setIsEditing(false);
  };

  const commitEdit = async () => {
    const next = (localTitle || '').trim();
    if (!next || next === title) {
      setIsEditing(false);
      return;
    }
    const patch = { title: next, updatedAt: new Date().toISOString() };

    // 1) optymistycznie zaktualizuj UI
    dispatch(pouchUpsertDoc({ _id: columnId, type: 'category', listId, icon, ...patch }));

    // 2) trwały zapis w bazie
    try {
      await updateColumn(columnId, patch);
    } finally {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();      
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleDeleteColumn = () => {
    destroyCategory(columnId);
  };

  if (isSearching && cards.length === 0) {
    return null;
  }

  return (
    <article className={styles.column}>
      <h2 className={styles.title}>
        <span className={`fa fa-${icon} ${styles.icon}`} />

        {isEditing ? (
          <input
            ref={inputRef}
            className={styles.titleInput}
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitEdit}
            placeholder="Column title..."
          />
        ) : (
          <>
            {' '}{title}
            <button
              className={styles.editBtn}
              title="Edit column name"
              onClick={startEdit}
              aria-label="Edit column name"
            >
              ✎
            </button>
          </>
        )}

        <button
          className={styles.removeBtn}
          title="Delete column"
          onClick={handleDeleteColumn}
          aria-label="Delete column"
        >
          ✖
        </button>
      </h2>

      <ul className={styles.cards}>
        {cards.map((card) => (
          <Card
            key={card._id}
            id={card._id}
            title={card.title}
            isFavorite={card.isFavorite}
          />
        ))}
      </ul>

      {!isSearching && <CardForm columnId={columnId} listId={listId} />}
    </article>
  );
};

export default Column;
