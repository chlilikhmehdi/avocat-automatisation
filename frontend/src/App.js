import { useState }         from 'react';
import { BrowserRouter }    from 'react-router-dom';

import { LangProvider }  from './context/LangContext';
import { ToastProvider } from './context/ToastContext';
import { injectGlobalStyles } from './styles/globalStyles';

import AppLayout    from './AppLayout';
import LoginScreen  from './pages/LoginScreen';
import api          from './services/api';

injectGlobalStyles();

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('mizan_user');
      const token  = localStorage.getItem('mizan_token');
      if (stored && token) return JSON.parse(stored);
    } catch { /* ignore */ }
    return null;
  });

  const handleLogin = (user) => setCurrentUser(user);

  const handleLogout = () => {
    api.setToken(null);
    localStorage.removeItem('mizan_user');
    setCurrentUser(null);
  };

  return (
    <LangProvider>
      <ToastProvider>
        <BrowserRouter>
          {!currentUser ? (
            <LoginScreen onLogin={handleLogin} />
          ) : (
            <AppLayout currentUser={currentUser} onLogout={handleLogout} />
          )}
        </BrowserRouter>
      </ToastProvider>
    </LangProvider>
  );
}