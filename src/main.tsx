import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import "./styles/index.css";
import { registerSW } from 'virtual:pwa-register';

// Sabon abu: yana bincika sabon version na app ɗin a background,
// kuma yana sabunta shi ta atomatik ba tare da user ya yi komai ba.
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
