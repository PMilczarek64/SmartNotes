import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import store from './redux/store';
import { bootstrapPouch } from './redux/pouchThunks';
import { ensureDatabaseHealthy } from './api/safeBootstrap';
import App from './App';
import './styles/normalize.scss';
import './styles/global.scss';
import 'font-awesome/css/font-awesome.min.css';
import 'react-quill/dist/quill.snow.css';

async function start() {
  try {
    await ensureDatabaseHealthy();
  } catch (e) {
    console.error('[ensureDatabaseHealthy] failed:', e);
  }

  store.dispatch(bootstrapPouch());
  console.log('%c[index.js] bootstrapPouch dispatched', 'color:lightgreen');

  const container = document.getElementById('root');
  const root = createRoot(container);

  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <Provider store={store}>
          <App />
        </Provider>
      </BrowserRouter>
    </React.StrictMode>
  );
}

start();
