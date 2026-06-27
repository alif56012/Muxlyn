import { translations } from '@muxlyn/shared';
import i18next from 'i18next';

i18next.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: translations.en },
    th: { translation: translations.th },
  },
  interpolation: {
    escapeValue: false,
  },
});

export function t(key: string, locale?: string): string {
  return i18next.t(key, { lng: locale }) || key;
}

export { i18next };
