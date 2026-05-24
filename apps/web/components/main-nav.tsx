"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

const LINKS = [
    { href: "/", key: "skills" },
    { href: "/commands", key: "commands" },
    { href: "/hooks", key: "hooks" },
    { href: "/presets", key: "presets" },
    { href: "/analytic", key: "analytics" },
    { href: "/graph", key: "graph" },
    { href: "/sources", key: "sources" },
    { href: "/discover", key: "discover" },
    { href: "/usecase", key: "usecase" },
] as const;

export function MainNav() {
    const pathname = usePathname();
    const t = useT();
    return (
        <nav className="flex items-center gap-1 text-sm">
            {LINKS.map((link) => {
                const active =
                    link.href === "/"
                        ? pathname === "/" || pathname.startsWith("/skills")
                        : pathname.startsWith(link.href);
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                            "whitespace-nowrap rounded-xs px-3 py-1.5 transition-colors",
                            active
                                ? "bg-accent font-semibold text-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        )}
                    >
                        {t.nav[link.key]}
                    </Link>
                );
            })}
        </nav>
    );
}
