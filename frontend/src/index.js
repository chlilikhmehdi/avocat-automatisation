import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import { LangProvider } from './context/LangContext';
import { ToastProvider } from './context/ToastContext';

const root = ReactDOM.createRoot(
  document.getElementById('root')
);

root.render(
  <LangProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </LangProvider>
);