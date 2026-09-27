import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import "./styles/index.css";
import { registerSW } from 'virtual:pwa-register';

// Auto-updates the app in the background by checking for a new
// version and applying it without requiring any user action.
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
