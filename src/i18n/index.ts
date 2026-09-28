export const LANGUAGES = {
  en: 'English',
  ha: 'Hausa',
  fr: 'Français',
  ar: 'العربية',
  yo: 'Yorùbá',
  ig: 'Igbo'
} as const;

export type Lang = keyof typeof LANGUAGES;

const RTL_LANGS: Lang[] = ['ar'];

const translations: Record<Lang, Record<string, string>> = {
  en: { home: 'Home', login: 'Log in', logout: 'Log out' },
  ha: { home: 'Gida', login: 'Shiga', logout: 'Fita' },
  fr: { home: 'Accueil', login: 'Se connecter', logout: 'Se déconnecter' },
  ar: { home: 'الرئيسية', login: 'تسجيل الدخول', logout: 'تسجيل الخروج' },
  yo: { home: 'Ilé', login: 'Wọlé', logout: 'Jáde' },
  ig: { home: 'Ụlọ', login: 'Banye', logout: 'Pụọ' }
};

function isLang(value: string | null): value is Lang {
  return !!value && value in LANGUAGES;
}

function applyDirection(lang: Lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
}

const stored = localStorage.getItem('lang');
let current: Lang = isLang(stored) ? stored : 'en';
applyDirection(current);

export function setLanguage(lang: Lang) {
  current = lang;
  localStorage.setItem('lang', lang);
  applyDirection(lang);
}

export function getLanguage(): Lang {
  return current;
}

export function t(key: string): string {
  return translations[current][key] ?? translations.en[key] ?? key;
}
