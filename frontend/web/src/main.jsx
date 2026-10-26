import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './store.jsx';
import App from './App.jsx';
import { bootTheme } from './theme.js';
import './wijmo.js';
import '@mescius/wijmo.styles/wijmo.css';
import './theme/fonts.css';
import './styles.css';

bootTheme();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
