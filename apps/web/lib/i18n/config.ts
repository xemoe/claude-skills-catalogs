/** Locale handling shared by the server (cookie reader) and the client (provider). */

export type Locale = "en" | "th";

export const LOCALES: readonly Locale[] = ["en", "th"];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie that persists the chosen locale so server components can read it. */
export const LOCALE_COOKIE = "skills-lector-locale";

/** Short labels for the language switcher. */
export const LOCALE_LABELS: Record<Locale, string> = {
    en: "EN",
    th: "ไทย",
};

export function isLocale(value: unknown): value is Locale {
    return value === "en" || value === "th";
}
