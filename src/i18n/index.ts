import en from './en';
import es from './es';
import de from './de';
import fr from './fr';
import it from './it';

type TranslationKey = keyof typeof en;
type TranslationValue = string | ((...args: any[]) => string);
type Translations = Record<TranslationKey, TranslationValue>;

const locales: Record<string, Translations> = {
  en: en as Translations,
  es: es as Translations,
  de: de as Translations,
  fr: fr as Translations,
  it: it as Translations,
};

function getLocale(): string {
  try {
    // Obsidian exposes locale via moment.locale()
    const lang = (window as any).moment?.locale?.() as string | undefined;
    if (lang) return lang.split('-')[0];
  } catch {
    // Outside Obsidian (tests, etc.)
  }
  return 'en';
}

export function t<K extends TranslationKey>(key: K): (typeof en)[K] {
  const lang = getLocale();
  const dict = locales[lang] ?? locales['en'];
  return (dict[key] ?? (en as Translations)[key]) as (typeof en)[K];
}
