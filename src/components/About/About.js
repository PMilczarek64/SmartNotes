import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { db, ensureIndexes } from '../../api/db';
import { pouchRemoveDoc, pouchSetAll } from '../../redux/pouchReducer';

const KEEP_LIST_ID = '3bf63938-31e1-4868-9e2d-aaae402511ac';

export default function About() {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  /**
   * CZYSZCZENIE DANYCH poza jedną listą
   */
  const handleCleanup = async () => {
    if (busy) return;
    const ok = window.confirm(
      'Na pewno? Usunę WSZYSTKIE listy/kolumny/karty poza tymi powiązanymi z wybraną listą.'
    );
    if (!ok) return;

    setBusy(true);
    setError('');
    setReport(null);

    try {
      await ensureIndexes();
      const [listsRes, catsRes, cardsRes] = await Promise.all([
        db.find({ selector: { type: 'list' } }),
        db.find({ selector: { type: 'category' } }),
        db.find({ selector: { type: 'card' } }),
      ]);

      const lists = listsRes.docs || [];
      const categories = catsRes.docs || [];
      const cards = cardsRes.docs || [];

      const keepList = lists.find(l => l._id === KEEP_LIST_ID);
      if (!keepList) throw new Error(`Lista do zachowania nie istnieje: ${KEEP_LIST_ID}`);

      const listsToDelete = lists.filter(l => l._id !== KEEP_LIST_ID);
      const categoriesToDelete = categories.filter(c => c.listId !== KEEP_LIST_ID);
      const cardsToDelete = cards.filter(c => c.listId !== KEEP_LIST_ID);

      const docsToDelete = [
        ...listsToDelete,
        ...categoriesToDelete,
        ...cardsToDelete,
      ].map(d => ({ _id: d._id, _rev: d._rev, _deleted: true }));

      if (docsToDelete.length) await db.bulkDocs(docsToDelete);

      listsToDelete.forEach(d => dispatch(pouchRemoveDoc({ _id: d._id, type: 'list' })));
      categoriesToDelete.forEach(d => dispatch(pouchRemoveDoc({ _id: d._id, type: 'category' })));
      cardsToDelete.forEach(d => dispatch(pouchRemoveDoc({ _id: d._id, type: 'card' })));

      setReport({
        lists: listsToDelete.length,
        categories: categoriesToDelete.length,
        cards: cardsToDelete.length,
        total: docsToDelete.length,
      });
    } catch (e) {
      console.error('[About.cleanup] failed:', e);
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  /**
   * PEŁNY RESET — usuwa bazę (PouchDB/IndexedDB + localStorage)
   * Używać gdy CHROME złapie inconsistent state
   */
  const handleFullReset = async () => {
    const ok = window.confirm(
      'UWAGA! To usunie absolutnie wszystko z bazy + localStorage.\nKontynuować?'
    );
    if (!ok) return;

    setBusy(true);
    try {
      await db.destroy();           // usuwa bazę IndexedDB
      localStorage.clear();         // czyści pamięć ustawień
      sessionStorage.clear();
      dispatch(pouchSetAll({ lists: [], categories: [], cards: [] })); // reset UI
      alert('Baza została wyczyszczona. Odśwież stronę.');
      window.location.reload();
    } catch (e) {
      console.error('[About.fullReset] error:', e);
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>About</h1>

      <h3>Czyszczenie artefaktów</h3>
      <p>
        Zachowuje tylko listę:
        <code style={{ marginLeft: 8 }}>{KEEP_LIST_ID}</code>
      </p>

      <button onClick={handleCleanup} disabled={busy} style={{ marginBottom: 16 }}>
        {busy ? 'Czyszczę…' : 'Wyczyść bazę (zostaw wskazaną listę)'}
      </button>

      <h3>Pełny reset bazy (naprawa Chrome)</h3>
      <p>Użyj gdy Chrome pokazuje pusty state, a Edge działa OK.</p>

      <button
        onClick={handleFullReset}
        disabled={busy}
        style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid darkred', color: 'darkred' }}
      >
        😱 Resetuj całą bazę PouchDB
      </button>

      {error && <p style={{ color: 'crimson', marginTop: 16 }}>Błąd: {error}</p>}
      {report && (
        <div style={{ marginTop: 16 }}>
          <strong>Usunięto:</strong>
          <ul>
            <li>listy: {report.lists}</li>
            <li>kolumny: {report.categories}</li>
            <li>karty: {report.cards}</li>
            <li>łącznie: {report.total}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
