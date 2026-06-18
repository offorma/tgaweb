export const locales = ['en', 'fr', 'ha', 'ig', 'yo'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export const localeNames: Record<Locale, { name: string; flag: string; native: string }> = {
  en: { name: 'English', flag: '🇬🇧', native: 'English' },
  fr: { name: 'French', flag: '🇫🇷', native: 'Français' },
  ha: { name: 'Hausa', flag: '🇳🇬', native: 'Hausa' },
  ig: { name: 'Igbo', flag: '🇳🇬', native: 'Igbo' },
  yo: { name: 'Yoruba', flag: '🇳🇬', native: 'Yorùbá' },
};
export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
