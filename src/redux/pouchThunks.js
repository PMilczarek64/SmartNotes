import { ensureIndexes, db } from '../api/db';
import * as repo from '../api/repos';
import { pouchSetAll, pouchUpsertDoc, pouchRemoveDoc } from './pouchReducer';

/**
 * 🧩 Inicjalizacja bazy PouchDB – ładuje wszystkie dokumenty i subskrybuje zmiany
 */
export const bootstrapPouch = () => async (dispatch) => {
  await ensureIndexes();

  const [lists, categories, cards] = await Promise.all([
    repo.listLists(),
    (await db.find({ selector: { type: 'category' } })).docs,
    (await db.find({ selector: { type: 'card' } })).docs,
  ]);

  dispatch(pouchSetAll({ lists, categories, cards }));

  // live sync zmian w bazie
  db.changes({ since: 'now', live: true, include_docs: true })
    .on('change', ({ doc, deleted }) => {
      if (deleted) dispatch(pouchRemoveDoc(doc));
      else dispatch(pouchUpsertDoc(doc));
    });
};

/**
 * 🧱 LISTS
 */
export const addList = (payload) => async () => {
  await repo.createList(payload);
};

export const editList = (id, patch) => async () => {
  await repo.updateList(id, patch);
};

export const removeList = (id) => async () => {
  await repo.deleteList(id);
};

/**
 * 🧩 CATEGORIES (czyli kolumny)
 */
export const addCategory = (payload) => async () => {
  // 👇 zapisz także ikonę, jeśli została podana
  const doc = {
    ...payload,
    icon: payload.icon || '',
  };
  await repo.createCategory(doc);
};

export const editCategory = (id, patch) => async () => {
  await repo.editCategory(id, patch);
};

export const removeCategory = (id) => async (dispatch) => {
  try {
    const cards = (await db.find({ selector: { type: 'card', categoryId: id } })).docs;
    await Promise.resolve(); // (opcjonalnie) nic, tylko żeby złapać błąd w try/catch

    // natychmiast usuń ze store (UI zniknie od razu)
    dispatch(pouchRemoveDoc({ _id: id, type: 'category' }));
    cards.forEach(c => dispatch(pouchRemoveDoc({ _id: c._id, type: 'card' })));

    // usuń fizycznie w bazie
    await repo.deleteCategory(id);
  } catch (e) {
    console.error('[removeCategory] failed:', e);
  }
};


/**
 * 🗂️ CARDS
 */
export const addCard = (p) => async (dispatch) => {
  const doc = await repo.createCard(p);
  console.log('[thunk:addCard] created card:', doc);
  dispatch(pouchUpsertDoc(doc));     // ← od razu do store
};


export const editCard = (id, patch) => async (dispatch, getState) => {
  const cur = (getState().pouch.cards || []).find(c => c._id === id);
  if (cur) {
    // natychmiastowy, pełny obiekt -> UI od razu reaguje
    dispatch(pouchUpsertDoc({ ...cur, ...patch, _id: id, type: 'card', updatedAt: new Date().toISOString() }));
  }
  // zapis do bazy (a potem i tak przyjdzie pełny doc z changes feed)
  await repo.updateCard(id, patch);
};

export const toggleFavorite = (id) => async () => {
  await repo.toggleFavoriteCard(id);
};

export const removeCard = (id) => async (dispatch) => {
  try {
    // 1) pobierz doc (żeby znać type i _rev)
    const doc = await db.get(id);           // { _id, _rev, type: 'card', ... }

    // 2) usuń z bazy
    await repo.deleteCard(id);

    // 3) usuń NATYCHMIAST ze store
    dispatch(pouchRemoveDoc({ _id: doc._id, type: doc.type }));
  } catch (e) {
    console.error('[removeCard] failed:', e);
  }
};

/**
 * 🔍 WYSZUKIWANIE
 */
export const searchCardsThunk = (query) => async () => {
  return await repo.searchCards(query);
};
