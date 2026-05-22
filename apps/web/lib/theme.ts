/** Theme handling shared by the server (cookie reader) and the client (toggle). */

export type Theme = "light" | "dark";

export const DEFAULT_THEME: Theme = "light";

/** Cookie that persists the chosen theme so the server renders the matching class. */
export const THEME_COOKIE = "skills-lector-theme";

export function isTheme(value: unknown): value is Theme {
    return value === "light" || value === "dark";
}
