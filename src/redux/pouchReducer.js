const INITIAL = { lists: [], categories: [], cards: [], loaded: false };

function upsertById(arr, doc) {
  const i = arr.findIndex(d => d._id === doc._id);
  if (i >= 0) {
    const merged = { ...arr[i], ...doc };
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
      if (!doc || !doc._id) return state;

      if (doc.type === 'list') {
        return { ...state, lists: state.lists.filter(d => d._id !== doc._id) };
      }
      if (doc.type === 'category') {
        return { ...state, categories: state.categories.filter(d => d._id !== doc._id) };
      }
      if (doc.type === 'card') {
        return { ...state, cards: state.cards.filter(d => d._id !== doc._id) };
      }

      return {
        ...state,
        lists: state.lists.filter(d => d._id !== doc._id),
        categories: state.categories.filter(d => d._id !== doc._id),
        cards: state.cards.filter(d => d._id !== doc._id),
      };
    }


    default:
      return state;
  }
}

/* Action creators */
export const pouchSetAll = (payload) => ({ type: 'pouch/setAll', payload });
export const pouchUpsertDoc = (payload) => ({ type: 'pouch/upsertDoc', payload });
export const pouchRemoveDoc = (payload) => ({ type: 'pouch/removeDoc', payload });

/* Selectors */
export const selectPouchLoaded = (s) => s.pouch?.loaded;
export const selectPouchLists = (s) => s.pouch?.lists || [];
export const selectPouchCategoriesByList = (listId) => (s) =>
  (s.pouch?.categories || []).filter(c => c.listId === listId);
export const selectPouchCardsByList = (listId) => (s) =>
  (s.pouch?.cards || []).filter(c => c.listId === listId);
