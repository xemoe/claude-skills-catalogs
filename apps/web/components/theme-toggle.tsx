"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";
import { type Theme, THEME_COOKIE } from "@/lib/theme";

export function ThemeToggle({ initialTheme }: { initialTheme: Theme }) {
    const t = useT();
    const [theme, setTheme] = useState<Theme>(initialTheme);
    const isDark = theme === "dark";

    function toggle() {
        const next: Theme = isDark ? "light" : "dark";
        document.documentElement.classList.toggle("dark", next === "dark");
        // Persist so the server renders the matching class on the next load.
        document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        setTheme(next);
    }

    const label = isDark ? t.theme.toLight : t.theme.toDark;

    return (
        <Button
            className="rounded-sm"
            variant="outline"
            size="icon-sm"
            onClick={toggle}
            aria-label={label}
            title={label}
        >
            {isDark ? <Sun /> : <Moon />}
        </Button>
    );
}
