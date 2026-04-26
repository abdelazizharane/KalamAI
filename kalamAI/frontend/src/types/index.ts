export interface Room {
  code: string;
  host: string;
  participants: Participant[];
  created_at: string;
  active: boolean;
}

export interface Participant {
  id: string;
  name: string;
  language: string;
}

export const LANGUAGES = [
  { code: "fr", label: "Français",    nativeLabel: "Français",    flag: "🇫🇷", countryCode: "fr" },
  { code: "en", label: "Anglais",     nativeLabel: "English",     flag: "🇬🇧", countryCode: "gb" },
  { code: "ar", label: "Arabe",       nativeLabel: "العربية",     flag: "🌍",  countryCode: "sa" },
  { code: "ha", label: "Haoussa",     nativeLabel: "Hausa",       flag: "🌍",  countryCode: "ng" },
  { code: "ff", label: "Fulfuldé",    nativeLabel: "Fulfulde",    flag: "🌍",  countryCode: "gn" },
  { code: "sw", label: "Swahili",     nativeLabel: "Kiswahili",   flag: "🌍",  countryCode: "tz" },
  { code: "pt", label: "Portugais",   nativeLabel: "Português",   flag: "🇵🇹", countryCode: "pt" },
  { code: "wo", label: "Wolof",       nativeLabel: "Wolof",       flag: "🌍",  countryCode: "sn" },
  { code: "am", label: "Amharique",   nativeLabel: "አማርኛ",        flag: "🇪🇹", countryCode: "et" },
  { code: "bm", label: "Bambara",     nativeLabel: "Bamanankan",  flag: "🌍",  countryCode: "ml" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
