import { AlertTriangle, CheckCircle2, ExternalLink, Star } from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { InlineCode } from "@/components/inline-code";
import { readDiscoverManifest } from "@lector/core/discover";
import type { DiscoverItem, DiscoverResult } from "@lector/core/types";
import { formatDate } from "@/lib/utils";
import { getServerI18n } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

function EmptyState({ t }: { t: Dictionary }) {
    const d = t.discoverPage;
    return (
        <div className="rounded-none border border-dashed p-12 text-center">
            <h3 className="text-base font-medium">{d.emptyTitle}</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                {d.empty1}
                <InlineCode>/discover-skills</InlineCode>
                {d.empty2}
                <InlineCode>discover-popular-skills</InlineCode>
                {d.empty3}
                <InlineCode>.discover/results.json</InlineCode>
                {d.empty4}
            </p>
            <div className="mx-auto mt-6 flex max-w-xs items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded-none bg-secondary p-2 text-left font-mono text-xs">
                    /discover-skills
                </code>
                <CopyButton value="/discover-skills" />
            </div>
        </div>
    );
}

function MetaLine({ result, t }: { result: DiscoverResult; t: Dictionary }) {
    const d = t.discoverPage;
    const m = result.manifest;
    if (!m) return null;
    const authLabel =
        m.auth === "gh" ? d.meta.authGh : d.meta.authAnonymous;
    return (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-muted-foreground">
            <span>
                {d.meta.discoveredAt}: {formatDate(m.discoveredAt)}
            </span>
            <span aria-hidden>·</span>
            <span>{d.meta.entries(result.items.length)}</span>
            <span aria-hidden>·</span>
            <span>
                {d.meta.auth}: {authLabel}
            </span>
        </p>
    );
}

function Queries({ result, t }: { result: DiscoverResult; t: Dictionary }) {
    const m = result.manifest;
    if (!m || !m.queries.length) return null;
    return (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">{t.discoverPage.meta.queries}:</span>
            {m.queries.map((q, i) => (
                <InlineCode key={i}>{q}</InlineCode>
            ))}
        </div>
    );
}

const NUMBER_FMT = new Intl.NumberFormat("en-US");

function EntryRow({
    item,
    t,
}: {
    item: DiscoverItem;
    t: Dictionary;
}) {
    const d = t.discoverPage;
    return (
        <tr className="border-b last:border-b-0">
            <td className="w-10 px-3 py-3 align-top tabular-nums text-muted-foreground">
                {item.rank}
            </td>
            <td className="px-3 py-3 align-top">
                <a
                    href={item.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
                    title={d.openRepo}
                >
                    {item.fullName}
                    <ExternalLink className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-foreground" />
                </a>
                {item.description && (
                    <p className="mt-1 text-xs text-muted-foreground">
                        {item.description}
                    </p>
                )}
                {item.vendored && item.vendorPath && (
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {d.vendoredHint(item.vendorPath)}
                    </p>
                )}
            </td>
            <td className="w-20 px-3 py-3 align-top text-right tabular-nums">
                <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 text-muted-foreground" />
                    {NUMBER_FMT.format(item.stars)}
                </span>
            </td>
            <td className="px-3 py-3 align-top">
                <div className="flex flex-wrap gap-1">
                    {item.topics.slice(0, 5).map((topic) => (
                        <Badge key={topic} variant="outline">
                            {topic}
                        </Badge>
                    ))}
                </div>
            </td>
            <td className="w-32 px-3 py-3 align-top">
                {item.vendored ? (
                    <Badge
                        variant="outline"
                        className="border-green-600/40 text-green-700 dark:border-green-400/40 dark:text-green-400"
                    >
                        <CheckCircle2 className="h-3 w-3" />
                        {d.badgeVendored}
                    </Badge>
                ) : (
                    <Badge variant="secondary">{d.badgeNotVendored}</Badge>
                )}
            </td>
        </tr>
    );
}

function EntriesTable({
    items,
    t,
}: {
    items: DiscoverItem[];
    t: Dictionary;
}) {
    const d = t.discoverPage;
    return (
        <div className="overflow-x-auto rounded-none border">
            <table className="w-full text-sm">
                <thead className="border-b bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                        <th className="w-10 px-3 py-2 font-medium">{d.colRank}</th>
                        <th className="px-3 py-2 font-medium">{d.colRepo}</th>
                        <th className="w-20 px-3 py-2 text-right font-medium">
                            {d.colStars}
                        </th>
                        <th className="px-3 py-2 font-medium">{d.colTopics}</th>
                        <th className="w-32 px-3 py-2 font-medium">{d.colStatus}</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <EntryRow key={item.fullName} item={item} t={t} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function CommandCard({
    heading,
    body,
    commands,
}: {
    heading: string;
    body: string;
    commands: string[];
}) {
    return (
        <Card className="rounded-sm">
            <CardHeader>
                <CardTitle className="text-base">{heading}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{body}</p>
                {commands.map((cmd) => (
                    <div key={cmd} className="flex items-start gap-2">
                        <code className="min-w-0 flex-1 break-all rounded-none bg-secondary p-2 font-mono text-xs">
                            {cmd}
                        </code>
                        <CopyButton value={cmd} />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

export default async function DiscoverPage() {
    const { t } = await getServerI18n();
    const d = t.discoverPage;
    const result = readDiscoverManifest();

    return (
        <div className="space-y-6 px-5 py-0">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{d.title}</h1>
                    <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                        {d.subtitle}
                    </p>
                </div>
                <MetaLine result={result} t={t} />
            </div>

            {result.manifest?.rateLimited && (
                <div className="flex items-start gap-2 rounded-none border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{d.rateLimited}</span>
                </div>
            )}

            {!result.manifestExists ? (
                <EmptyState t={t} />
            ) : (
                <>
                    <Queries result={result} t={t} />
                    {result.items.length > 0 ? (
                        <EntriesTable items={result.items} t={t} />
                    ) : (
                        <EmptyState t={t} />
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <CommandCard
                            heading={d.actionsHeading}
                            body={d.actionsBody}
                            commands={[d.cmdClone, d.cmdInstall]}
                        />
                        <CommandCard
                            heading={d.refreshHeading}
                            body={d.refreshBody}
                            commands={[d.cmdSearch]}
                        />
                    </div>
                </>
            )}

            {result.errors.length > 0 && (
                <details className="rounded-none border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-700 dark:bg-amber-950/40">
                    <summary className="flex cursor-pointer items-center gap-2 text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {d.readErrors}
                    </summary>
                    <ul className="mt-2 space-y-1 font-mono text-muted-foreground">
                        {result.errors.slice(0, 30).map((e, i) => (
                            <li key={i}>{e}</li>
                        ))}
                    </ul>
                </details>
            )}
        </div>
    );
}
