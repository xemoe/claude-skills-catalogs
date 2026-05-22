"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CountBadge } from "@/components/count-badge";
import { SKILL_TYPE_META } from "@/components/skill-type";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import type { Skill, SkillType } from "@lector/core/types";

const TYPE_ORDER: SkillType[] = ["personal", "plugin", "project", "local"];

export function SkillSidebar({ skills }: { skills: Skill[] }) {
    const pathname = usePathname();
    const t = useT();
    const currentId =
        pathname && pathname.startsWith("/skills/")
            ? pathname.slice("/skills/".length)
            : null;

    const [query, setQuery] = useState("");
    const activeRef = useRef<HTMLAnchorElement>(null);

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        const matched = q
            ? skills.filter(
                    (s) =>
                        s.name.toLowerCase().includes(q) ||
                        s.description.toLowerCase().includes(q) ||
                        (s.plugin?.name.toLowerCase().includes(q) ?? false),
                )
            : skills;
        return TYPE_ORDER.map((type) => ({
            type,
            items: matched
                .filter((s) => s.type === type)
                .sort((a, b) => a.name.localeCompare(b.name)),
        })).filter((g) => g.items.length > 0);
    }, [skills, query]);

    useEffect(() => {
        activeRef.current?.scrollIntoView({ block: "nearest" });
    }, [currentId]);

    return (
        <aside className="lg:sticky lg:top-[4.5rem] lg:w-72 lg:shrink-0">
            <div className="flex flex-col overflow-hidden bg-card ring-1 ring-foreground/10 lg:max-h-[calc(100vh-6rem)]">
                <Link
                    href="/"
                    className="flex items-center gap-2 border-b px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
                >
                    <LayoutDashboard className="h-4 w-4 text-primary" />
                    <span>{t.sidebar.allSkills}</span>
                    <CountBadge className="ml-auto font-normal text-muted-foreground">
                        {skills.length}
                    </CountBadge>
                </Link>

                <div className="border-b p-2">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={t.sidebar.filterSkills}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-7"
                            aria-label={t.sidebar.filterSkillsAria}
                        />
                    </div>
                </div>

                <nav className="min-h-0 max-h-80 flex-1 overflow-y-auto p-1.5 lg:max-h-none">
                    {groups.length === 0 ? (
                        <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                            {t.sidebar.noSkillsMatch}
                        </p>
                    ) : (
                        groups.map((g) => (
                            <div key={g.type} className="mb-1.5 last:mb-0">
                                <div className="flex items-center gap-1.5 px-2 pb-1 pt-2">
                                    <span
                                        className={cn(
                                            "h-2 w-2 rounded-full",
                                            SKILL_TYPE_META[g.type].dot,
                                        )}
                                        aria-hidden
                                    />
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        {t.skillTypes[g.type]}
                                    </span>
                                    <span className="text-[11px] tabular-nums text-muted-foreground/70">
                                        {g.items.length}
                                    </span>
                                </div>
                                <ul>
                                    {g.items.map((s) => {
                                        const isActive = s.id === currentId;
                                        return (
                                            <li key={s.id}>
                                                <Link
                                                    ref={isActive ? activeRef : undefined}
                                                    href={`/skills/${s.id}`}
                                                    aria-current={isActive ? "page" : undefined}
                                                    title={s.description}
                                                    className={cn(
                                                        "block border-l-2 py-1.5 pl-2.5 pr-2 transition-colors",
                                                        isActive
                                                            ? "border-primary bg-accent"
                                                            : "border-transparent hover:bg-accent/60",
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            "block truncate text-sm",
                                                            isActive
                                                                ? "font-semibold text-foreground"
                                                                : "font-medium text-foreground/90",
                                                        )}
                                                    >
                                                        {s.name}
                                                    </span>
                                                    <span className="block truncate text-xs text-muted-foreground">
                                                        {s.description}
                                                    </span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))
                    )}
                </nav>
            </div>
        </aside>
    );
}
