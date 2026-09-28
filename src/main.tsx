import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import "./styles/index.css";
import { registerSW } from 'virtual:pwa-register';

// Yana duba sabon version kowane minti, yana kuma amfani da shi kai tsaye
// ba tare da users sun yi komai ba.
registerSW({
  immediate: true,
  onRegistered(reg) {
    if (!reg) return;
    setInterval(() => reg.update(), 60 * 1000);
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
