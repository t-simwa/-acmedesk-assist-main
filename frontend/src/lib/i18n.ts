import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import de from '../locales/de.json';
import ar from '../locales/ar.json';
import zh from '../locales/zh.json';
import ja from '../locales/ja.json';
import pt from '../locales/pt.json';
import it from '../locales/it.json';
import ru from '../locales/ru.json';
import hi from '../locales/hi.json';
import ko from '../locales/ko.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  ar: { translation: ar },
  zh: { translation: zh },
  ja: { translation: ja },
  pt: { translation: pt },
  it: { translation: it },
  ru: { translation: ru },
  hi: { translation: hi },
  ko: { translation: ko },
};

// RTL languages
const rtlLanguages = ['ar', 'he'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

// Set document direction based on language
export const updateDocumentDirection = (lng: string) => {
  const isRTL = rtlLanguages.includes(lng);
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
};

// Initialize direction on load
const currentLang = i18n.language || 'en';
updateDocumentDirection(currentLang);

// Update direction when language changes
i18n.on('languageChanged', (lng) => {
  updateDocumentDirection(lng);
});

export default i18n;
