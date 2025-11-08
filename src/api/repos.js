import { db } from './db';
import { v4 as uuid } from 'uuid';

const now = () => new Date().toISOString();

/** =============== LISTS =============== */
export async function createList({ title, description = '', icon = '' }) {
  const doc = {
    _id: `${uuid()}`,          // zostaw taki format jak masz obecnie
    type: 'list',
    title,
    description,               // ← DODANE
    icon,
    createdAt: now(),
    updatedAt: now(),
  };
  await db.put(doc);
  return doc;
}

export async function updateList(id, patch) {
  const cur = await db.get(id);
  const next = { ...cur, ...patch, updatedAt: now() };
  await db.put(next);
  return next;
}
export async function deleteList(id) {
  const cats = (await db.find({ selector: { type: 'category', listId: id } })).docs;
  const cards = (await db.find({ selector: { type: 'card', listId: id } })).docs;
  for (const d of [...cats, ...cards]) await db.remove(d);
  await db.remove(await db.get(id));
}
export async function listLists() {
  const res = await db.find({ selector: { type: 'list' } });
  const arr = res.docs;
  arr.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return arr;
}

/** ============ CATEGORIES ============ */
export async function createCategory({ listId, title, icon = '' }) {
  const doc = {
    _id: `category:${uuid()}`,
    type: 'category',
    listId,
    title,
    icon,               
    createdAt: now(),
    updatedAt: now(),
  };
  await db.put(doc);
  return doc;            
};

export const editCategory = (id, patch) => async (dispatch, getState, { db }) => {
  const current = await db.get(id);
  const updated = { ...current, ...patch, updatedAt: now() };
  await db.put(updated);
  dispatch({ type: 'pouch/upsertDoc', payload: updated });
  return updated;
};

export async function deleteCategory(id) {
  const cards = (await db.find({ selector: { type: 'card', categoryId: id } })).docs;
  for (const card of cards) await db.remove(card);
  await db.remove(await db.get(id));
}


export async function listCategoriesByList(listId) {
  return (await db.find({ selector: { type: 'category', listId } })).docs;
}

/** ================ CARDS ================ */
export async function createCard({ listId, categoryId = null, title, content = '', description = '', tags = [] }) {
  const doc = {
    _id: `card:${uuid()}`,
    type: 'card',
    listId,
    categoryId,
    title,
    content,          // <— DODANE
    description,      // (możesz pominąć jeśli content wystarczy)
    tags,
    isFavorite: false,
    createdAt: now(),
    updatedAt: now(),
  };
  await db.put(doc);
  return doc;
}

export async function updateCard(id, patch) {
  const cur = await db.get(id);
  const next = { ...cur, ...patch, updatedAt: now() };
  await db.put(next);
  return next;
}
export async function toggleFavoriteCard(id) {
  const cur = await db.get(id);
  return updateCard(id, { isFavorite: !cur.isFavorite });
}
export async function deleteCard(id) {
  await db.remove(await db.get(id));
}
export async function listCardsByList(listId) {
  const res = await db.find({ selector: { type: 'card', listId } });
  const arr = res.docs;
  arr.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return arr;
}

// proste wyszukiwanie po tytule/opisie (+ tagi/favorites)
export async function searchCards({ q = '', tags = [], favoritesOnly = false, listId = null } = {}) {
  let cards = (await db.find({ selector: { type: 'card', ...(listId ? { listId } : {}) } })).docs;

  if (favoritesOnly) cards = cards.filter(c => !!c.isFavorite);

  if (q) {
    const s = q.toLowerCase();
    cards = cards.filter(c =>
      (c.title || '').toLowerCase().includes(s) ||
      (c.description || '').toLowerCase().includes(s)
    );
  }

  if (tags?.length) {
    const set = new Set(tags.map(t => String(t).toLowerCase()));
    cards = cards.filter(c => (c.tags || []).some(t => set.has(String(t).toLowerCase())));
  }

  cards.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return cards;
}

/** ============ (opcjonalnie) ZAŁĄCZNIKI ============ */
export async function addCardAttachment(cardId, file) {
  const doc = await db.get(cardId);
  await db.putAttachment(cardId, file.name, doc._rev, file, file.type || 'application/octet-stream');
}
export async function getCardAttachmentUrl(cardId, name) {
  const blob = await db.getAttachment(cardId, name);
  return URL.createObjectURL(blob);
}
