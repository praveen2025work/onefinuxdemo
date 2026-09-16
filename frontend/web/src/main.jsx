import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { setLicenseKey } from '@mescius/wijmo';
import { AppProvider } from './store.jsx';
import App from './App.jsx';
import '@mescius/wijmo.styles/wijmo.css';
import './theme/fonts.css';
import './styles.css';

const wijmoKey = import.meta.env.VITE_WIJMO_LICENSE;
if (wijmoKey) setLicenseKey(wijmoKey);

const forced = new URLSearchParams(window.location.search).get('theme');
const saved = (forced === 'light' || forced === 'dark') ? forced : localStorage.getItem('ofx-theme');
if (saved) {
  document.documentElement.setAttribute('data-theme', saved);
  if (forced === 'light' || forced === 'dark') localStorage.setItem('ofx-theme', forced);
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
