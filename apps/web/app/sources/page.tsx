import Link from "next/link";
import { ExternalLink, FolderOpen, GitBranch, Github, Package } from "lucide-react";
import { scanSkills } from "@lector/core/scanner";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { InlineCode } from "@/components/inline-code";
import { getServerI18n } from "@/lib/i18n/server";
import type { Skill, SourceKind } from "@lector/core/types";

export const dynamic = "force-dynamic";

type GroupKind = SourceKind | "plugin";

interface SourceGroup {
    key: string;
    title: string;
    kind: GroupKind;
    url?: string;
    skills: Skill[];
}

function SourceIcon({ kind }: { kind: GroupKind }) {
    if (kind === "github") return <Github className="h-4 w-4 shrink-0" />;
    if (kind === "git") return <GitBranch className="h-4 w-4 shrink-0" />;
    if (kind === "plugin")
        return <Package className="h-4 w-4 shrink-0 text-purple-600" />;
    return <FolderOpen className="h-4 w-4 shrink-0" />;
}

export default async function SourcesPage() {
    const { t } = await getServerI18n();
    const result = scanSkills();

    const groups = new Map<string, SourceGroup>();
    for (const s of result.skills) {
        let key: string;
        let title: string;
        let kind: GroupKind;
        if (s.type === "plugin" && s.plugin && s.source.kind === "local") {
            key = `plugin::${s.plugin.name}`;
            title = s.plugin.name;
            kind = "plugin";
        } else {
            key = `${s.source.kind}::${s.source.label}`;
            title = s.source.label;
            kind = s.source.kind;
        }
        const existing = groups.get(key);
        if (existing) existing.skills.push(s);
        else groups.set(key, { key, title, kind, url: s.source.url, skills: [s] });
    }
    const sorted = [...groups.values()].sort(
        (a, b) => b.skills.length - a.skills.length,
    );

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t.sources.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t.sources.subtitle}
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {sorted.map((group) => (
                    <Card key={group.key}>
                        <CardHeader className="space-y-0 pb-3">
                            <div className="flex items-center gap-2">
                                <SourceIcon kind={group.kind} />
                                <CardTitle className="min-w-0 flex-1 truncate text-base">
                                    {group.title}
                                </CardTitle>
                                <span className="shrink-0 rounded-none border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                    {t.sources.kinds[group.kind]}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                                <span>{t.sources.skillCount(group.skills.length)}</span>
                                {group.url && (
                                    <a
                                        href={group.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                                    >
                                        {t.sources.openRepository}{" "}
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ul className="flex flex-wrap gap-1.5">
                                {group.skills.map((s) => (
                                    <li key={s.id}>
                                        <Link
                                            href={`/skills/${s.id}`}
                                            className="inline-flex rounded-none border bg-secondary/40 px-2 py-0.5 text-xs hover:bg-secondary"
                                        >
                                            {s.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                ))}
                {sorted.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t.sources.noSources}</p>
                )}
            </div>

            <div className="space-y-3">
                <h2 className="text-lg font-semibold tracking-tight">
                    {t.sources.scanLocations}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {t.sources.scanLocationsDesc1}
                    <InlineCode>skills-lector.config.json</InlineCode>
                    {t.sources.scanLocationsDesc2}
                </p>
                <div className="ring-1 ring-foreground/10">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>{t.sources.colLocation}</TableHead>
                                <TableHead>{t.sources.colPath}</TableHead>
                                <TableHead className="w-[110px]">{t.sources.colType}</TableHead>
                                <TableHead className="w-[90px] text-right">
                                    {t.sources.colSkills}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {result.roots.map((root) => (
                                <TableRow key={root.path} className="hover:bg-transparent">
                                    <TableCell className="font-medium">
                                        {t.sources.rootLabel(root.labelKey, root.labelArg)}
                                    </TableCell>
                                    <TableCell className="max-w-[420px] truncate font-mono text-xs text-muted-foreground">
                                        {root.path}
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs text-muted-foreground">
                                            {t.sources.rootKinds[root.kind]}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {root.count}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
