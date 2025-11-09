import { ensureIndexes, db } from '../api/db';
import * as repo from '../api/repos';
import { pouchSetAll, pouchUpsertDoc, pouchRemoveDoc } from './pouchReducer';

/** Pomocnicze: hurtowe kasowanie z kontrolą błędów */
async function bulkHardDelete(docs) {
  if (!docs.length) return;
  const res = await db.bulkDocs(docs);
  const failed = res.filter(r => r.error);
  if (failed.length) {
    console.error('[bulkHardDelete] częściowa porażka:', failed);
    const retry = [];
    for (const f of failed) {
      try {
        const fresh = await db.get(f.id);
        retry.push({ _id: fresh._id, _rev: fresh._rev, _deleted: true });
      } catch {}
    }
    if (retry.length) await db.bulkDocs(retry);
  }
}

/** Sprzątanie dzieci po liście – do użycia w thunk i w changes */
async function purgeListChildren(listId, dispatch) {
  const [catsRes, cardsRes] = await Promise.all([
    db.find({ selector: { type: 'category', listId } }),
    db.find({ selector: { type: 'card',     listId } }),
  ]);
  const cats = catsRes.docs || [];
  const cards = cardsRes.docs || [];

  // usuń natychmiast ze store (UI)
  cats.forEach(c => dispatch?.(pouchRemoveDoc({ _id: c._id, type: 'category' })));
  cards.forEach(c => dispatch?.(pouchRemoveDoc({ _id: c._id, type: 'card' })));

  // fizycznie w bazie
  const tombstones = [
    ...cats.map(c => ({ _id: c._id, _rev: c._rev, _deleted: true })),
    ...cards.map(c => ({ _id: c._id, _rev: c._rev, _deleted: true })),
  ];
  await bulkHardDelete(tombstones);
}

/** INIT + live changes */
export const bootstrapPouch = () => async (dispatch, getState) => {
  await ensureIndexes();

  const [lists, categories, cards] = await Promise.all([
    repo.listLists(),
    (await db.find({ selector: { type: 'category' } })).docs,
    (await db.find({ selector: { type: 'card' } })).docs,
  ]);

  dispatch(pouchSetAll({ lists, categories, cards }));

  // Live feed z "sprzątaczem"
  db.changes({ since: 'now', live: true, include_docs: true })
    .on('change', async (change) => {
      const { id, deleted, doc } = change;

      if (deleted) {
        const state = getState();
        const type =
          (state.pouch?.lists || []).some(x => x._id === id) ? 'list' :
          (state.pouch?.categories || []).some(x => x._id === id) ? 'category' :
          (state.pouch?.cards || []).some(x => x._id === id) ? 'card' :
          doc?.type || null;

        if (type) dispatch(pouchRemoveDoc({ _id: id, type }));

        // 2) jeśli to lista (albo nie wiemy co, ale warto posprzątać),
        //    usuń wszystkie dzieci z tym listId (id == listId)
        //    – dzięki temu dokończymy porządki nawet po konfliktach _rev
        await purgeListChildren(id, dispatch);

        return;
      }

      if (doc && doc.type && doc._id) {
        dispatch(pouchUpsertDoc(doc));
      }
    })
    .on('error', (e) => {
      console.error('[pouch changes] error:', e);
    });
};

/** LISTS */
export const addList = (payload) => async () => {
  await repo.createList(payload);
};

export const editList = (id, patch) => async () => {
  await repo.updateList(id, patch);
};

export const removeList = (listId) => async (dispatch) => {
  try {
    // optymistycznie usuń listę ze store
    dispatch(pouchRemoveDoc({ _id: listId, type: 'list' }));

    // usuń dzieci (UI + baza)
    await purgeListChildren(listId, dispatch);

    // usuń samą listę w bazie (ze świeżym _rev)
    const listDoc = await db.get(listId);
    await db.remove(listDoc);
    // changes-feed i tak dociągnie tombstone; UI już jest spójne
  } catch (e) {
    console.error('[removeList cascade] failed:', e);
  }
};

/** CATEGORIES */
export const addCategory = (payload) => async () => {
  const doc = { ...payload, icon: payload.icon || '' };
  await repo.createCategory(doc);
};

export const editCategory = (id, patch) => async () => {
  await repo.editCategory(id, patch);
};

export const removeCategory = (id) => async (dispatch) => {
  try {
    const [catDoc, cardsRes] = await Promise.all([
      db.get(id),
      db.find({ selector: { type: 'card', categoryId: id } }),
    ]);
    const cards = cardsRes.docs || [];

    // UI
    dispatch(pouchRemoveDoc({ _id: id, type: 'category' }));
    cards.forEach(c => dispatch(pouchRemoveDoc({ _id: c._id, type: 'card' })));

    // Baza
    await bulkHardDelete([
      ...cards.map(c => ({ _id: c._id, _rev: c._rev, _deleted: true })),
      { _id: catDoc._id, _rev: catDoc._rev, _deleted: true },
    ]);
  } catch (e) {
    console.error('[removeCategory] failed:', e);
  }
};

export const addCard = (p) => async (dispatch) => {
  const doc = await repo.createCard(p);
  dispatch(pouchUpsertDoc(doc));
};

export const editCard = (id, patch) => async (dispatch, getState) => {
  const cur = (getState().pouch.cards || []).find(c => c._id === id);
  if (cur) {
    dispatch(pouchUpsertDoc({
      ...cur, ...patch, _id: id, type: 'card', updatedAt: new Date().toISOString()
    }));
  }
  await repo.updateCard(id, patch);
};

export const toggleFavorite = (id) => async () => {
  await repo.toggleFavoriteCard(id);
};

export const removeCard = (id) => async (dispatch) => {
  try {
    const doc = await db.get(id);
    await repo.deleteCard(id);
    dispatch(pouchRemoveDoc({ _id: doc._id, type: doc.type }));
  } catch (e) {
    console.error('[removeCard] failed:', e);
  }
};

// === KONTEKSTOWE WYSZUKIWANIE Z RANKINGIEM ===
export const searchCardsThunk = (params) => async (dispatch, getState) => {
  const {
    listId = null,
    q = '',
    favoritesOnly = false,
    tags = [],
  } = params || {};

  const state = getState();
  let cards = (state.pouch?.cards || []).slice();

  // 1) wstępne filtry
  if (listId) cards = cards.filter(c => c.listId === listId);
  if (favoritesOnly) cards = cards.filter(c => !!c.isFavorite);

  // 2) przygotowanie zapytania
  const query = (q || '').trim().toLowerCase();
  const qTokens = query
    ? query.split(/[^a-z0-9ąęółśżźćń\-#]+/i).filter(Boolean)
    : [];

  // dodatkowe tagi z parametru + tagi z #tokenów w q
  const explicitTags = (Array.isArray(tags) ? tags : []).map(t => String(t).toLowerCase());
  const hashTagsFromQ = qTokens.filter(t => t.startsWith('#')).map(t => t.slice(1));
  const allWantedTags = new Set([...explicitTags, ...hashTagsFromQ].filter(Boolean));

  // pomocnicze
  const norm = (v) => String(v || '').toLowerCase();
  const containsPhrase = (hay, needle) => hay.includes(needle);
  const tokensIn = (text) => {
    const n = norm(text);
    return new Set(n.split(/[^a-z0-9ąęółśżźćń\-]+/i).filter(Boolean));
  };
  const daysSince = (iso) => {
    if (!iso) return 9999;
    const d = new Date(iso).getTime();
    if (Number.isNaN(d)) return 9999;
    const diffMs = Date.now() - d;
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  };

  // 3) scoring
  const scored = cards.map(card => {
    const title = norm(card.title);
    const desc  = norm(card.description);
    const cardTags = Array.isArray(card.tags) ? card.tags.map(norm) : [];

    let score = 0;

    // dopasowanie frazy
    if (query) {
      if (title === query) score += 50;                   // idealny tytuł
      if (containsPhrase(title, query)) score += 15;      // fraza w tytule
      if (containsPhrase(desc,  query)) score += 8;       // fraza w opisie
    }

    // dopasowanie tokenów
    if (qTokens.length) {
      const titleTok = tokensIn(title);
      const descTok  = tokensIn(desc);

      qTokens.forEach(tok => {
        if (!tok || tok.startsWith('#')) return; // #tagi liczymy niżej
        if (titleTok.has(tok)) score += 8;
        if (descTok.has(tok))  score += 3;
        // startsWith/partial (lekka waga)
        if ([...titleTok].some(t => t.startsWith(tok))) score += 3;
        if ([...descTok].some(t => t.startsWith(tok)))  score += 1;
      });
    }

    // dopasowanie tagów
    if (allWantedTags.size) {
      const setTags = new Set(cardTags);
      allWantedTags.forEach(t => {
        if (setTags.has(t)) score += 10;                                  // tag idealny
        else if (cardTags.some(ct => ct.includes(t))) score += 5;         // częściowe
      });
    } else {
      // jeśli brak explicit tag-search: potraktuj #tokeny z tytułu/opisu jako lekkie dopasowanie
      const inlineTags = [
        ...title.match(/#[\w\-ąćęłńóśźż]+/gi) || [],
        ...desc.match(/#[\w\-ąćęłńóśźż]+/gi)  || [],
      ].map(s => s.slice(1).toLowerCase());
      const hit = qTokens.filter(t => t && !t.startsWith('#'))
        .some(t => inlineTags.includes(t));
      if (hit) score += 4;
    }

    // bonusy
    if (card.isFavorite) score += 2;
    const d = daysSince(card.updatedAt || card.createdAt);
    score += Math.max(0, 10 - Math.floor(d / 7)); // świeżość: do +10, opada co tydzień

    return { ...card, _score: score };
  });

  // 4) odfiltrowanie "pustych" trafień przy niepustym zapytaniu
  const filtered = query
    ? scored.filter(c => c._score > 0)
    : scored;

  // 5) sortowanie: score desc, potem nowsze
  filtered.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    const ad = a.updatedAt || a.createdAt || '';
    const bd = b.updatedAt || b.createdAt || '';
    return (bd || '').localeCompare(ad || '');
  });

  return filtered;
};
