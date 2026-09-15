import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './store.jsx';
import App from './App.jsx';
import './theme/fonts.css';
import './styles.css';

const saved = localStorage.getItem('ofx-theme');
if (saved) document.documentElement.setAttribute('data-theme', saved);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
