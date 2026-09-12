import React, {createContext, useContext, useEffect, useState} from 'react';
const LanguageContext = createContext(null);
const STORAGE_KEY = 'llm-infra.language';
export function readInitialLanguage() {
  try { const saved = localStorage.getItem(STORAGE_KEY); if (saved === 'en' || saved === 'zh') return saved; } catch {}
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}
export function LanguageProvider({children}) {
  const [lang, setLang] = useState(readInitialLanguage);
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  }, [lang]);
  useEffect(() => {
    const sync = event => { if (event.key === STORAGE_KEY && ['en','zh'].includes(event.newValue)) setLang(event.newValue); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  return <LanguageContext.Provider value={[lang, setLang]}>{children}</LanguageContext.Provider>;
}
export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('LanguageProvider is required');
  return value;
}
