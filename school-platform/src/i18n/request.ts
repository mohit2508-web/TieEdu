import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, type Locale } from './config';

export default getRequestConfig(async ({ locale }) => {
  const active: Locale = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale;
  return {
    locale: active,
    messages: (await import(`../../messages/${active}.json`)).default,
  };
});
