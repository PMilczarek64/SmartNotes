import React, { useMemo, useState, useCallback } from 'react';

/** Separatory: przecinek, średnik, spacje, #, nowa linia */
const SPLIT_RE = /[,\s;#]+/g;

function normalizeTag(t) {
  return String(t).trim().replace(/\s+/g, ' ').toLowerCase();
}

export default function TagInput({ tags = [], onCommit, disabled = false }) {
  const [input, setInput] = useState('');

  const parsedInput = useMemo(() => {
    const arr = (input || '')
      .split(SPLIT_RE)
      .map(normalizeTag)
      .filter(Boolean);

    return Array.from(new Set(arr)).filter((t) => !tags.includes(t));
  }, [input, tags]);

  const handleAdd = useCallback(() => {
    if (!parsedInput.length || disabled) return;
    const next = Array.from(new Set([...(tags || []), ...parsedInput]));
    onCommit && onCommit(next);
    setInput('');
  }, [parsedInput, tags, onCommit, disabled]);

  const handleRemove = useCallback(
    (tag) => {
      if (disabled) return;
      const next = (tags || []).filter((t) => normalizeTag(t) !== normalizeTag(tag));
      onCommit && onCommit(next);
    },
    [tags, onCommit, disabled]
  );

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <label style={{ fontWeight: 600 }}>Tagi</label>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="np. praca, #priorytet; 2025"
          disabled={disabled}
          style={{ flex: 1, padding: 8 }}
        />

        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled || parsedInput.length === 0}
          style={{ padding: '8px 12px' }}
        >
          Dodaj
        </button>
      </div>

      {parsedInput.length > 0 && (
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Do dodania: {parsedInput.join(', ')}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(tags || []).length === 0 && (
          <span style={{ fontSize: 12, opacity: 0.65 }}>Brak tagów</span>
        )}

        {(tags || []).map((t) => (
          <span
            key={t}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 8px',
              borderRadius: 999,
              border: '1px solid #ddd',
            }}
          >
            <span>#{t}</span>
            <button
              type="button"
              onClick={() => handleRemove(t)}
              disabled={disabled}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
