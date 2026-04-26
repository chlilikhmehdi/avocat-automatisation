import { useLang } from '../../context/LangContext';

export default function LangToggle() {
  const { lang, toggleLang } = useLang();
  return (
    <div style={{ position: 'fixed', top: 14, right: 16, zIndex: 999 }}>
      <div className="lang-toggle">
        <button
          className={`lang-btn${lang === 'fr' ? ' active' : ''}`}
          onClick={() => toggleLang('fr')}
        >
          FR
        </button>
        <button
          className={`lang-btn${lang === 'ar' ? ' active' : ''}`}
          onClick={() => toggleLang('ar')}
        >
          AR
        </button>
      </div>
    </div>
  );
}