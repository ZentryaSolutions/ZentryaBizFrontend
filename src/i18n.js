import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslations from './locales/en.json';

// English-only UI (no Urdu / other locales bundled)
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslations },
  },
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en'],
  defaultNS: 'translation',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;









