import { LANGUAGES, getLanguage, setLanguage, type Lang } from '../i18n';

export default function LanguageSelector() {
  return (
    <select
      defaultValue={getLanguage()}
      onChange={(e) => {
        setLanguage(e.target.value as Lang);
        window.location.reload();
      }}
    >
      {(Object.keys(LANGUAGES) as Lang[]).map((code) => (
        <option key={code} value={code}>
          {LANGUAGES[code]}
        </option>
      ))}
    </select>
  );
      }
