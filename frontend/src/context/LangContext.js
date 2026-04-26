import { createContext, useContext, useState } from 'react';
import { T } from '../config/constants';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState('fr');

  const toggleLang = (l) => {
    setLang(l);
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <LangContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        t: T[lang],
      }}
    >
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);

  if (!ctx) {
    throw new Error(
      'LangProvider is missing (wrap your App)'
    );
  }

  return ctx;
}