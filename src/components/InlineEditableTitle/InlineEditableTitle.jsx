import React, { useEffect, useRef, useState } from 'react';
import styles from './InlineEditableTitle.module.scss';

export default function InlineEditableTitle({
  value,
  onSave,               // async | sync (string) => void
  className = '',
  placeholder = 'Untitled…',
  editable = true,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => { if (!editing) setDraft(value || ''); }, [value, editing]);

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const commit = async () => {
    const next = draft.trim();
    if (next !== (value || '')) {
      await onSave?.(next);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value || '');
    setEditing(false);
  };

  if (!editable) {
    return <span className={`${styles.title} ${className}`}>{value || placeholder}</span>;
  }

  return (
    <span className={`${styles.wrapper} ${className}`}>
      {editing ? (
        <input
          ref={inputRef}
          className={styles.input}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
        />
      ) : (
        <>
          <span className={styles.title} title={value || placeholder}>
            {value || placeholder}
          </span>
          <button
            type="button"
            className={styles.editBtn}
            aria-label="Edytuj tytuł"
            onClick={() => setEditing(true)}
            title="Edytuj"
          >
            <i className="fa fa-pencil" />
          </button>
        </>
      )}
    </span>
  );
}
