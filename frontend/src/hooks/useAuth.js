import { useState } from 'react';

// Lit la session sauvegardée au démarrage
function loadSession() {
  try {
    const user  = localStorage.getItem('mizan_user');
    const token = localStorage.getItem('mizan_token');
    if (user && token) return JSON.parse(user);
  } catch { /* session corrompue → ignorée */ }
  return null;
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(loadSession);

  const login = (user, token) => {
    localStorage.setItem('mizan_token', token);
    localStorage.setItem('mizan_user', JSON.stringify(user));
    setCurrentUser(user);
  };

  const logout = () => {
    localStorage.removeItem('mizan_token');
    localStorage.removeItem('mizan_user');
    setCurrentUser(null);
  };

  return { currentUser, login, logout };
}