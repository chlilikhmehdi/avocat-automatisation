import { createContext, useContext, useState } from 'react';
import { T } from '../config/constants';

export const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState('fr');

  const toggleLang = (l) => {
    setLang(l);
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <LangContext.Provider value={{ lang, t: T[lang], toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);