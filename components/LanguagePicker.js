'use client';

import { LANGUAGE_OPTIONS, normalizeLanguage, normalizeLanguageList } from '../lib/profileOptions';

export default function LanguagePicker({ value = [], onChange, label = 'Lingue parlate' }) {
  const selected = normalizeLanguageList(value);
  const available = LANGUAGE_OPTIONS.filter((language) => !selected.includes(language.value));

  const addLanguage = (event) => {
    const language = normalizeLanguage(event.target.value);
    if (!language || selected.includes(language)) return;
    onChange([...selected, language]);
    event.target.value = '';
  };

  return (
    <div className="field language-picker">
      <label className="field__label">
        {label}
        <select defaultValue="" onChange={addLanguage} aria-label={`Aggiungi ${label.toLowerCase()}`}>
          <option value="">Seleziona una lingua…</option>
          {available.map((language) => (
            <option key={language.value} value={language.value}>{language.label}</option>
          ))}
          {selected.filter((language) => !LANGUAGE_OPTIONS.some((option) => option.value === language)).map((language) => (
            <option key={language} value={language}>{language} (valore attuale)</option>
          ))}
        </select>
      </label>
      <div className="language-picker__selected" aria-live="polite">
        {selected.map((language) => {
          const option = LANGUAGE_OPTIONS.find((item) => item.value === language);
          return (
            <span className="language-chip" key={language}>
              {option?.label || language}
              <button type="button" onClick={() => onChange(selected.filter((item) => item !== language))} aria-label={`Rimuovi ${option?.label || language}`}>
                ×
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
