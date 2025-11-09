const SET_INDEX = 'searchIndex/SET';
const CLEAR_INDEX = 'searchIndex/CLEAR';

const initial = { index: null, byId: null };
export default function searchIndexReducer(state = initial, action = {}) {
  switch (action.type) {
    case SET_INDEX:   return { index: action.payload.index, byId: action.payload.byId };
    case CLEAR_INDEX: return initial;
    default:          return state;
  }
}

export const setSearchIndex = (payload) => ({ type: SET_INDEX, payload });
export const clearSearchIndex = () => ({ type: CLEAR_INDEX });
export const selectSearchIndex = (s) => s.searchIndex || { index: null, byId: null };
