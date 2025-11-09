import {
  legacy_createStore as createStore,
  combineReducers,
  applyMiddleware,
} from 'redux';
import { thunk } from 'redux-thunk';
import { composeWithDevTools } from '@redux-devtools/extension';

import initialState from './initialState';
import pouchReducer from './pouchReducer';
import searchStringReducer from './searchStringRedux';

const reducer = combineReducers({

  pouch: pouchReducer,
  searchString: searchStringReducer,
});

const store = createStore(
  reducer,
  initialState,
  composeWithDevTools(applyMiddleware(thunk))
);

export default store;
