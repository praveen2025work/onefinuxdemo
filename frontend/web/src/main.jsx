import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './store.jsx';
import App from './App.jsx';
import './theme/fonts.css';
import './styles.css';

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
