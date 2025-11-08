// src/redux/pouchReducer.js

const INITIAL = { lists: [], categories: [], cards: [], loaded: false };

/** Bezpieczny upsert: scala istniejący dokument z nowym, zamiast nadpisywać całość */
function upsertById(arr, doc) {
  const i = arr.findIndex(d => d._id === doc._id);
  if (i >= 0) {
    const merged = { ...arr[i], ...doc }; // <-- KLUCZ: SCAL
    const copy = arr.slice();
    copy[i] = merged;
    return copy;
  }
  return [...arr, doc];
}

export default function pouchReducer(state = INITIAL, action) {
  switch (action.type) {
    case 'pouch/setAll': {
      const {
        lists = [],
        categories = [],
        cards = [],
      } = action.payload || {};

      return {
        ...state,
        lists: Array.isArray(lists) ? lists : [],
        categories: Array.isArray(categories) ? categories : [],
        cards: Array.isArray(cards) ? cards : [],
        loaded: true,
      };
    }

    case 'pouch/upsertDoc': {
      const doc = action.payload;
      if (!doc || !doc.type || !doc._id) return state;

      if (doc.type === 'list') {
        return { ...state, lists: upsertById(state.lists, doc) };
      }
      if (doc.type === 'category') {
        return { ...state, categories: upsertById(state.categories, doc) };
      }
      if (doc.type === 'card') {
        return { ...state, cards: upsertById(state.cards, doc) };
      }
      return state;
    }

    case 'pouch/removeDoc': {
      const doc = action.payload;
      if (!doc || !doc.type || !doc._id) return state;

      const key =
        doc.type === 'list' ? 'lists' :
        doc.type === 'category' ? 'categories' :
        doc.type === 'card' ? 'cards' : null;

      if (!key) return state;
      return { ...state, [key]: state[key].filter(d => d._id !== doc._id) };
    }

    default:
      return state;
  }
}

/* Action creators */
export const pouchSetAll   = (payload) => ({ type: 'pouch/setAll',    payload });
export const pouchUpsertDoc = (payload) => ({ type: 'pouch/upsertDoc', payload });
export const pouchRemoveDoc = (payload) => ({ type: 'pouch/removeDoc', payload });

/* Selectors */
export const selectPouchLoaded = (s) => s.pouch?.loaded;
export const selectPouchLists = (s) => s.pouch?.lists || [];
export const selectPouchCategoriesByList = (listId) => (s) =>
  (s.pouch?.categories || []).filter(c => c.listId === listId);
export const selectPouchCardsByList = (listId) => (s) =>
  (s.pouch?.cards || []).filter(c => c.listId === listId);
