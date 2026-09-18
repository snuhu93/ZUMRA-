type Lang = 'en' | 'ha';

const translations: Record<Lang, Record<string, string>> = {
  en: { home: 'Home', login: 'Log in', logout: 'Log out' },
  ha: { home: 'Gida', login: 'Shiga', logout: 'Fita' }
};

let current: Lang = (localStorage.getItem('lang') as Lang) || 'en';

export function setLanguage(lang: Lang) {
  current = lang;
  localStorage.setItem('lang', lang);
}

export function getLanguage(): Lang {
  return current;
}

export function t(key: string): string {
  return translations[current][key] ?? translations.en[key] ?? key;
}
