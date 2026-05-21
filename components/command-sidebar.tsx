"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, SquareTerminal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CountBadge } from "@/components/count-badge";
import { SKILL_TYPE_META } from "@/components/skill-type";
import { cn } from "@/lib/utils";
import type { Command, CommandScope } from "@/lib/types";

const SCOPE_ORDER: CommandScope[] = ["personal", "plugin", "project"];

export function CommandSidebar({ commands }: { commands: Command[] }) {
  const pathname = usePathname();
  const currentId =
    pathname && pathname.startsWith("/commands/")
      ? pathname.slice("/commands/".length)
      : null;

  const [query, setQuery] = useState("");
  const activeRef = useRef<HTMLAnchorElement>(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? commands.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            (c.plugin?.name.toLowerCase().includes(q) ?? false),
        )
      : commands;
    return SCOPE_ORDER.map((scope) => ({
      scope,
      items: matched
        .filter((c) => c.scope === scope)
        .sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((g) => g.items.length > 0);
  }, [commands, query]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentId]);

  return (
    <aside className="lg:sticky lg:top-[4.5rem] lg:w-72 lg:shrink-0">
      <div className="flex flex-col overflow-hidden bg-card ring-1 ring-foreground/10 lg:max-h-[calc(100vh-6rem)]">
        <Link
          href="/commands"
          className="flex items-center gap-2 border-b px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
        >
          <SquareTerminal className="h-4 w-4 text-primary" />
          <span>All commands</span>
          <CountBadge className="ml-auto font-normal text-muted-foreground">
            {commands.length}
          </CountBadge>
        </Link>

        <div className="border-b p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter commands…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-7"
              aria-label="Filter commands"
            />
          </div>
        </div>

        <nav className="min-h-0 max-h-80 flex-1 overflow-y-auto p-1.5 lg:max-h-none">
          {groups.length === 0 ? (
            <p className="px-2 py-8 text-center text-xs text-muted-foreground">
              No commands match your filter.
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.scope} className="mb-1.5 last:mb-0">
                <div className="flex items-center gap-1.5 px-2 pb-1 pt-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      SKILL_TYPE_META[g.scope].dot,
                    )}
                    aria-hidden
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {SKILL_TYPE_META[g.scope].label}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground/70">
                    {g.items.length}
                  </span>
                </div>
                <ul>
                  {g.items.map((c) => {
                    const isActive = c.id === currentId;
                    return (
                      <li key={c.id}>
                        <Link
                          ref={isActive ? activeRef : undefined}
                          href={`/commands/${c.id}`}
                          aria-current={isActive ? "page" : undefined}
                          title={c.description}
                          className={cn(
                            "block border-l-2 py-1.5 pl-2.5 pr-2 transition-colors",
                            isActive
                              ? "border-primary bg-accent"
                              : "border-transparent hover:bg-accent/60",
                          )}
                        >
                          <span
                            className={cn(
                              "block truncate font-mono text-sm",
                              isActive
                                ? "font-semibold text-foreground"
                                : "font-medium text-foreground/90",
                            )}
                          >
                            /{c.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {c.description}
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
