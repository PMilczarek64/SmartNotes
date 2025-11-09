// src/hooks/pouchHooks.js
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useMemo, useState } from 'react';
import { scoreCardAgainstQuery, normalizeText } from '../utils/textSearch';

import {
  selectPouchLists,
  selectPouchCategoriesByList,
  selectPouchCardsByList,
} from '../redux/pouchReducer';

import {
  addList, removeList, editList,
  addCategory,       
  editCategory,
  removeCategory,      
  addCard, editCard, toggleFavorite, removeCard,
  searchCardsThunk,
} from '../redux/pouchThunks';

/* =====================================================================================
 *  READ HOOKS
 * ===================================================================================== */

// ====== LISTS ======
export function usePouchLists() {
  const lists = useSelector(selectPouchLists);
  console.log('%c[usePouchLists] raw lists from Redux:', 'color:cyan', lists);

  const sorted = useMemo(() => {
    const arr = [...lists].sort(
      (a, b) => b.updatedAt?.localeCompare(a.updatedAt || '') || 0
    );
    console.log('%c[usePouchLists] sorted lists returned:', 'color:cyan', arr);
    return arr;
  }, [lists]);

  return sorted;
}

// ====== COLUMNS (CATEGORIES) ======
export function usePouchColumns(listId) {
  const selectColumnsForList = useMemo(
    () => selectPouchCategoriesByList(listId),
    [listId]
  );
  const columns = useSelector(selectColumnsForList);

  const sorted = useMemo(() => {
    const arr = [...columns].sort(
      (a, b) => a.createdAt?.localeCompare(b.createdAt || '') || 0
    );
    console.log('%c[usePouchColumns] for list:', 'color:orange', listId, arr);
    return arr;
  }, [columns, listId]);

  return sorted;
}


// src/hooks/pouchHooks.js – fragment usePouchCards
export function usePouchCards({ listId, categoryId = null, q = undefined, favoritesOnly = false }) {
  const selectCardsForList = useMemo(() => selectPouchCardsByList(listId), [listId]);
  const cardsAll = useSelector(selectCardsForList);

  const globalQ = useSelector(state => state?.searchString?.searchKey || '');
  const effectiveQ = (typeof q === 'string') ? q : globalQ;

  const filtered = useMemo(() => {
    let out = [...cardsAll];
    if (categoryId) out = out.filter(c => c.categoryId === categoryId);
    if (favoritesOnly) out = out.filter(c => !!c.isFavorite);

    if (effectiveQ) {
      const s = effectiveQ.toLowerCase().trim();

      out = out.filter(c => {
        const inTitle = (c.title || '').toLowerCase().includes(s);
        const inDesc  = (c.description || '').toLowerCase().includes(s);

        const inTags = Array.isArray(c.tags)
          ? c.tags.some(t => String(t).toLowerCase().includes(s))
          : false;

        return inTitle || inDesc || inTags;
      });
    }

    return out.sort((a, b) => b.updatedAt?.localeCompare(a.updatedAt || '') || 0);
  }, [cardsAll, categoryId, favoritesOnly, effectiveQ]);

  return filtered;
}




// ====== SEARCH ======
export function usePouchSearch({ listId, q = '', favoritesOnly = false, tags = [] }) {
  const dispatch = useDispatch();
  const [results, setResults] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await dispatch(searchCardsThunk({ listId, q, favoritesOnly, tags }));
      const data = res?.payload ?? res;
      if (alive) setResults(Array.isArray(data) ? data : []);
    })();
    return () => { alive = false; };
  }, [dispatch, listId, q, favoritesOnly, JSON.stringify(tags)]);

  return results;
}

/* =====================================================================================
 *  WRITE HOOKS (ACTIONS)
 * ===================================================================================== */

export function usePouchActions() {
  const dispatch = useDispatch();

  // ====== LISTS ======
  const createList = (payload) => dispatch(addList(payload));
  const updateList = (id, patch) => dispatch(editList(id, patch));
  const destroyList = (id) => dispatch(removeList(id));

  // ====== COLUMNS ======
  const createColumn = (payload) => dispatch(addCategory(payload));      // create
 const updateColumn = (id, patch) => { return dispatch(editCategory(id, patch)); }; // update
  const createCategory = (payload) => dispatch(addCategory(payload));    // alias
  const destroyCategory = (id) => dispatch(removeCategory(id));

  // ====== CARDS ======
  // w usePouchActions()
const createCard = (payload) => {
  if (!payload?.listId) {
    console.error('[createCard] Missing listId in payload:', payload);
    return;
  }
  if (!payload?.categoryId) {
    console.error('[createCard] Missing categoryId in payload:', payload);
    return;
  }
  console.log('%c[usePouchActions.createCard] payload:', 'color:lime', payload);
  return dispatch(addCard(payload));
};


  const updateCard = (id, patch) => dispatch(editCard(id, patch));
  const toggleCardFavorite = (id) => dispatch(toggleFavorite(id));
  const destroyCard = (id) => dispatch(removeCard(id));

  return {
    // lists
    createList, updateList, destroyList,
    // columns
    createColumn, updateColumn, createCategory, destroyCategory,
    // cards
    createCard, updateCard, toggleCardFavorite, destroyCard,
  };
}
