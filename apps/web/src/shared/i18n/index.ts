import { translations } from '@muxlyn/shared';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

const savedLocale = typeof window !== 'undefined' ? localStorage.getItem('locale') : null;

i18next.use(initReactI18next).init({
  lng: savedLocale ?? 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: translations.en },
    th: { translation: translations.th },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18next;
