import { db } from './db';
import { v4 as uuid } from 'uuid';

const now = () => new Date().toISOString();

/** =============== LISTS =============== */
export async function createList({ title, description = '', icon = '' }) {
  const doc = {
    _id: `${uuid()}`,          
    type: 'list',
    title,
    description,               
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


export async function editCategory(id, patch = {}) {
  const cur = await db.get(id);                                    // ma _id i _rev
  const next = {
    ...cur,
    ...patch,
    _id: id,
    type: 'category',
    updatedAt: new Date().toISOString(),
  };
  const res = await db.put(next);                                  // zapis z poprawnym _rev
  return { ...next, _rev: res.rev };                               // zwróć pełny doc po zapisie
}

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
    content,         
    description,     
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


export async function searchCards({ listId, q = '', tags = [], favoritesOnly = false } = {}) {
  const selector = { type: 'card' };
  if (listId) selector.listId = listId;
  if (favoritesOnly) selector.isFavorite = true;

  const { docs } = await db.find({
    selector,
    fields: ['_id', '_rev', 'title', 'description', 'tags', 'updatedAt', 'listId', 'categoryId', 'isFavorite']
  });

  const query = (q || '').trim().toLowerCase();
  const words = query ? query.split(/\s+/).filter(Boolean) : [];
  const tagSet = new Set((tags || []).map(t => String(t).toLowerCase()));

  const scored = docs.map(d => {
    const title = (d.title || '').toLowerCase();
    const desc  = (d.description || '').toLowerCase();
    const dtags = Array.isArray(d.tags) ? d.tags.map(t => String(t).toLowerCase()) : [];

    let score = 0;

    if (query) {
      // pełny ciąg
      if (title.includes(query)) score += 6;
      if (desc.includes(query))  score += 3;

      // słowa
      for (const w of words) {
        if (title.includes(w)) score += 4;
        if (desc.includes(w))  score += 2;
      }
    }

    // tagi – silny sygnał
    let tagMatches = 0;
    if (tagSet.size) {
      for (const t of dtags) if (tagSet.has(t)) tagMatches++;
      score += tagMatches * 5;
    }

    return { ...d, _score: score, _tagMatches: tagMatches };
  })
  // Jeśli był query lub tagi – filtrujemy do trafień; jeśli nie, zwracamy wszystko (np. dla pustego q)
  .filter(d => {
    if (tagSet.size && !query) return d._tagMatches > 0;
    if (!tagSet.size && query) return d._score > 0;
    if (tagSet.size && query)  return d._score > 0 || d._tagMatches > 0;
    return true;
  })
  // sort: najpierw wynik trafności, potem nowsze
  .sort((a, b) => (b._score - a._score) || (b.updatedAt || '').localeCompare(a.updatedAt || ''));

  return scored;
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
