import countries from 'i18n-iso-countries';
import italianCountries from 'i18n-iso-countries/langs/it.json' with { type: 'json' };
import languages from 'iso-639-1';

countries.registerLocale(italianCountries);

const countryNames = countries.getNames('it');
const languageDisplayNames = new Intl.DisplayNames(['it'], { type: 'language' });

export const COUNTRY_OPTIONS = Object.entries(countryNames)
  .map(([code, label]) => ({ value: code, label }))
  .sort((a, b) => a.label.localeCompare(b.label, 'it'));

export const LANGUAGE_OPTIONS = languages.getAllCodes()
  .map((code) => ({
    value: code,
    label: languageDisplayNames.of(code) || languages.getName(code),
    englishName: languages.getName(code),
  }))
  .sort((a, b) => a.label.localeCompare(b.label, 'it'));

export const CONTRACT_STATUS_OPTIONS = [
  { value: 'svincolato', label: 'Svincolato' },
  { value: 'sotto_contratto', label: 'Sotto contratto' },
  { value: 'prestito', label: 'In prestito' },
  { value: 'in_prova', label: 'In prova' },
  { value: 'settore_giovanile', label: 'Settore giovanile' },
  { value: 'dilettante', label: 'Dilettante' },
  { value: 'professionista', label: 'Professionista' },
  { value: 'altro', label: 'Altro' },
];

export const COACH_LICENSE_OPTIONS = [
  'Nessun patentino',
  'Licenza D',
  'UEFA C',
  'UEFA B',
  'UEFA A',
  'UEFA Pro',
  'UEFA Youth B',
  'UEFA Elite Youth A',
  'UEFA Goalkeeper B',
  'UEFA Goalkeeper A',
  'Altro',
].map((value) => ({ value, label: value }));

export const FORMATION_OPTIONS = [
  '4-3-3', '4-2-3-1', '4-4-2', '4-4-2 (rombo)', '4-1-4-1',
  '4-3-1-2', '4-2-2-2', '4-3-2-1', '3-5-2', '3-4-3', '3-4-2-1',
  '3-4-1-2', '5-3-2', '5-4-1', '4-5-1', 'Altro',
].map((value) => ({ value, label: value }));

const COUNTRY_ALIASES = new Map();
for (const option of COUNTRY_OPTIONS) {
  COUNTRY_ALIASES.set(option.value.toLowerCase(), option.value);
  COUNTRY_ALIASES.set(option.label.toLowerCase(), option.value);
  const englishName = countries.getName(option.value, 'en');
  if (englishName) COUNTRY_ALIASES.set(englishName.toLowerCase(), option.value);
}
const ADDITIONAL_COUNTRY_ALIASES = new Map([
  ['uk', 'GB'], ['great britain', 'GB'], ['england', 'GB'], ['scotland', 'GB'],
  ['wales', 'GB'], ['northern ireland', 'GB'],
  ['usa', 'US'], ['u.s.a.', 'US'], ['united states of america', 'US'],
]);

const LANGUAGE_ALIASES = new Map();
for (const option of LANGUAGE_OPTIONS) {
  LANGUAGE_ALIASES.set(option.value.toLowerCase(), option.value);
  LANGUAGE_ALIASES.set(option.label.toLowerCase(), option.value);
  LANGUAGE_ALIASES.set(option.englishName.toLowerCase(), option.value);
}

export function normalizeCountry(value) {
  if (!value) return '';
  const normalized = value.trim().toLowerCase();
  return COUNTRY_ALIASES.get(normalized) || ADDITIONAL_COUNTRY_ALIASES.get(normalized) || value.trim();
}

export function countryLabel(value) {
  const code = normalizeCountry(value);
  return countryNames[code] || value || '';
}

export function countrySearchValues(value) {
  const code = normalizeCountry(value);
  const englishName = countries.getName(code, 'en');
  const additionalAliases = code === 'GB'
    ? ['UK', 'Great Britain', 'England', 'Scotland', 'Wales', 'Northern Ireland']
    : code === 'US' ? ['USA', 'U.S.A.', 'United States of America'] : [];
  return [...new Set([code, countryNames[code], englishName, value, ...additionalAliases].filter(Boolean))];
}

export function normalizeLanguage(value) {
  if (!value) return '';
  return LANGUAGE_ALIASES.get(value.trim().toLowerCase()) || value.trim();
}

export function languageSearchValues(value) {
  const code = normalizeLanguage(value);
  const option = LANGUAGE_OPTIONS.find((language) => language.value === code);
  return [...new Set([code, option?.label, option?.englishName, value].filter(Boolean))];
}

export function canonicalContractStatus(value) {
  if (!value) return '';
  const normalized = value.trim().toLowerCase();
  if (['club', 'sotto contratto', 'contratto'].includes(normalized)) return 'sotto_contratto';
  if (['in prestito', 'loan'].includes(normalized)) return 'prestito';
  if (['free agent', 'unattached'].includes(normalized)) return 'svincolato';
  const byLabel = CONTRACT_STATUS_OPTIONS.find((option) => option.label.toLowerCase() === normalized);
  if (byLabel) return byLabel.value;
  if (CONTRACT_STATUS_OPTIONS.some((option) => option.value === normalized)) return normalized;
  return value.trim();
}

export function contractStatusSearchValues(value) {
  const canonical = canonicalContractStatus(value);
  const aliases = {
    sotto_contratto: ['sotto_contratto', 'sotto contratto', 'contratto', 'club'],
    prestito: ['prestito', 'in prestito', 'in_prestito', 'loan'],
    svincolato: ['svincolato', 'free agent', 'unattached'],
  };
  const option = CONTRACT_STATUS_OPTIONS.find((item) => item.value === canonical);
  return [...new Set([...(aliases[canonical] || [canonical]), option?.label, value].filter(Boolean))];
}

export function withLegacyOption(options, value) {
  if (!value || options.some((option) => option.value === value)) return options;
  return [{ value, label: `${value} (valore attuale)` }, ...options];
}

export function normalizeLanguageList(values) {
  return [...new Set((values || []).map(normalizeLanguage).filter(Boolean))];
}
