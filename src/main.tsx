import React from 'react';
import ReactDOM from 'react-dom/client';
import App  from './App';
import './index.css';
import { setupAuthInterceptor, requestPersistentStorage } from './utils/auth';

// NOVO: Importa e ativa o registro do PWA
import { registerSW } from 'virtual:pwa-register';
registerSW({ immediate: true }); // NOVO

setupAuthInterceptor();
requestPersistentStorage();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);