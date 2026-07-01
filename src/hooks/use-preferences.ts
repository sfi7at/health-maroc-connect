import { useEffect, useState, useCallback } from "react";

export type AppLang = "fr" | "ar" | "en";
export type AppTheme = "light" | "dark";

const LANG_KEY = "hl_lang";
const THEME_KEY = "hl_theme";

export function applyLang(lang: AppLang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

export function applyTheme(theme: AppTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function readLang(): AppLang {
  if (typeof window === "undefined") return "fr";
  const v = window.localStorage.getItem(LANG_KEY) as AppLang | null;
  return v === "ar" || v === "en" || v === "fr" ? v : "fr";
}

export function readTheme(): AppTheme {
  if (typeof window === "undefined") return "light";
  const v = window.localStorage.getItem(THEME_KEY) as AppTheme | null;
  if (v === "dark" || v === "light") return v;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function initPreferences() {
  applyLang(readLang());
  applyTheme(readTheme());
}

export function useLanguage() {
  const [lang, setLangState] = useState<AppLang>(() => readLang());
  useEffect(() => {
    applyLang(lang);
  }, [lang]);
  const setLang = useCallback((next: AppLang) => {
    window.localStorage.setItem(LANG_KEY, next);
    setLangState(next);
  }, []);
  return [lang, setLang] as const;
}

export function useTheme() {
  const [theme, setThemeState] = useState<AppTheme>(() => readTheme());
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  const setTheme = useCallback((next: AppTheme) => {
    window.localStorage.setItem(THEME_KEY, next);
    setThemeState(next);
  }, []);
  return [theme, setTheme] as const;
}