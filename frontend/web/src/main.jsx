import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './store.jsx';
import App from './App.jsx';
import { bootTheme } from './theme.js';
import { installFdc3 } from './workspace/fdc3.js';
import './wijmo.js';
import '@mescius/wijmo.styles/wijmo.css';
// One Finance design standard: palette tokens, then the shared Wijmo skin (after wijmo.css), then the console.
import '@theme/onefinux-tokens.css';
import '@theme/onefinux-wijmo.css';
import './theme/fonts.css';
import './styles.css';

bootTheme();
// Screen-to-screen standard: window.fdc3 (FDC3 2.0) in every console document, before any screen mounts.
installFdc3();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
