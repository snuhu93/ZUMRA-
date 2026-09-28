import { LANGUAGES, setLanguage, useLang, type Lang } from '@/i18n';

export default function LanguageSelector() {
  const lang = useLang();
  return (
    <select
      value={lang}
      onChange={(e) => setLanguage(e.target.value as Lang)}
      className="rounded-lg border border-gray-300 bg-transparent px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
    >
      {(Object.keys(LANGUAGES) as Lang[]).map((code) => (
        <option key={code} value={code}>
          {LANGUAGES[code]}
        </option>
      ))}
    </select>
  );
}
