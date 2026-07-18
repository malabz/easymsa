import {
  createContext,
  type ReactNode,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  dictionary,
  type Dictionary,
  type Locale
} from "./dictionary";

type LanguageContextValue = {
  locale: Locale;
  dictionary: Dictionary;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
};

export const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "easymsa.locale";

function getInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "en";
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "zh" || saved === "en") {
    return saved;
  }

  return window.navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      dictionary: dictionary[locale],
      setLocale,
      toggleLocale: () => setLocale((current) => (current === "zh" ? "en" : "zh"))
    }),
    [locale]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
