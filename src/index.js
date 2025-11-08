import ReactDOM from 'react-dom';
import React from 'react';
import { Provider } from 'react-redux';
import store from './redux/store';          
import { bootstrapPouch } from './redux/pouchThunks';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import './styles/normalize.scss';
import './styles/global.scss';
import 'font-awesome/css/font-awesome.min.css';
import 'react-quill/dist/quill.snow.css';


store.dispatch(bootstrapPouch());
console.log('%c[index.js] bootstrapPouch dispatched', 'color:lightgreen');
ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <App />
      </Provider>
    </BrowserRouter>
  </React.StrictMode>,
  document.querySelector('#root')
);