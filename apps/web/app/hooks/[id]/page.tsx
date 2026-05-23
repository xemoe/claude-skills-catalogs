import path from "path";
import { notFound } from "next/navigation";
import { FileText, Package, Webhook } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { getHookById } from "@lector/core/hook-scanner";
import { lastCommitDate } from "@lector/core/git";
import { SkillTypeBadge } from "@/components/skill-type-badge";
import { SourceBadge } from "@/components/source-badge";
import { CopyButton } from "@/components/copy-button";
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { formatBytes, formatDate, formatRelativeTime } from "@/lib/utils";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

function MetaRow({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-4 py-2 text-sm">
            <span className="shrink-0 text-muted-foreground">{label}</span>
            <span className="min-w-0 text-right">{children}</span>
        </div>
    );
}

export default async function HookDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const { t, locale } = await getServerI18n();
    const hook = getHookById(id);
    if (!hook) notFound();

    const committedAt = hook.source.repoRoot
        ? lastCommitDate(hook.source.repoRoot, hook.sourcePath)
        : null;
    const fileName = path.basename(hook.sourcePath);
    const matcherDisplay = hook.matcher || t.detail.matcherAny;

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="flex items-center gap-2 font-mono text-2xl font-bold tracking-tight">
                        <Webhook className="h-5 w-5 text-muted-foreground" />
                        {hook.event}
                    </h1>
                    <SkillTypeBadge type={hook.scope} />
                    <span className="font-mono text-sm text-muted-foreground">
                        · {matcherDisplay}
                    </span>
                </div>
            </div>

            <Card className="min-w-0 rounded-sm">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardAction>
                        <MetaRow label={t.detail.lastModified}>
                            <span title={formatDate(hook.lastUpdated)}>
                                {formatRelativeTime(hook.lastUpdated, locale)}
                            </span>
                        </MetaRow>
                    </CardAction>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <Webhook className="h-4 w-4" /> {t.detail.command}
                    </CardTitle>
                </CardHeader>
                <Separator className="border-b border-dotted border-gray-200" />
                <CardContent>
                    <div className="flex items-start gap-2">
                        <code className="min-w-0 flex-1 whitespace-pre-wrap break-all rounded-none bg-secondary p-3 font-mono text-xs">
                            {hook.command}
                        </code>
                        <CopyButton value={hook.command} />
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="h-4 w-4" /> {t.detail.sourceFile}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex items-start gap-2">
                        <code className="min-w-0 flex-1 break-all rounded-none bg-secondary p-2 text-xs">
                            {hook.sourcePath}
                        </code>
                        <CopyButton value={hook.sourcePath} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        {fileName} · {formatBytes(hook.sourceSizeBytes)}
                    </p>
                </CardContent>
            </Card>

            <div className="grid items-start gap-6 grid-cols-2">
                <Card className="rounded-sm">
                    <CardHeader>
                        <CardTitle className="text-base">{t.detail.details}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="divide-y">
                            <MetaRow label={t.detail.event}>
                                <span className="font-mono text-xs">{hook.event}</span>
                            </MetaRow>
                            <MetaRow label={t.detail.matcher}>
                                {hook.matcher ? (
                                    <span className="font-mono text-xs">{hook.matcher}</span>
                                ) : (
                                    <span className="text-xs text-muted-foreground">
                                        {t.detail.matcherAny}
                                    </span>
                                )}
                            </MetaRow>
                            <MetaRow label={t.detail.commandType}>
                                <span className="font-mono text-xs">{hook.type}</span>
                            </MetaRow>
                            {hook.timeout !== undefined && (
                                <MetaRow label={t.detail.timeout}>
                                    <span className="font-mono text-xs">
                                        {t.detail.timeoutSeconds(hook.timeout)}
                                    </span>
                                </MetaRow>
                            )}
                            <MetaRow label={t.detail.source}>
                                <span className="flex min-w-0 items-center justify-end gap-1">
                                    <SourceBadge source={hook.source} />
                                    <CopyButton
                                        value={hook.source.url ?? hook.source.label}
                                        size="icon-xs"
                                        className="shrink-0"
                                    />
                                </span>
                            </MetaRow>
                            {hook.source.branch && (
                                <MetaRow label={t.detail.branch}>
                                    <span className="font-mono text-xs">
                                        {hook.source.branch}
                                    </span>
                                </MetaRow>
                            )}
                            <MetaRow label={t.detail.lastModified}>
                                <span title={formatDate(hook.lastUpdated)}>
                                    {formatRelativeTime(hook.lastUpdated, locale)}
                                </span>
                            </MetaRow>
                            {committedAt && (
                                <MetaRow label={t.detail.lastCommit}>
                                    <span title={formatDate(committedAt)}>
                                        {formatRelativeTime(committedAt, locale)}
                                    </span>
                                </MetaRow>
                            )}
                            <MetaRow label={t.detail.sourceFileSize}>
                                {formatBytes(hook.sourceSizeBytes)}
                            </MetaRow>
                        </div>
                    </CardContent>
                </Card>

                {hook.plugin && (
                    <Card className="rounded-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Package className="h-4 w-4" /> {t.detail.plugin}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="divide-y">
                                <MetaRow label={t.detail.name}>{hook.plugin.name}</MetaRow>
                                {hook.plugin.version && (
                                    <MetaRow label={t.detail.version}>
                                        <span className="font-mono text-xs">
                                            {hook.plugin.version}
                                        </span>
                                    </MetaRow>
                                )}
                                {hook.plugin.author && (
                                    <MetaRow label={t.detail.author}>
                                        {hook.plugin.author}
                                    </MetaRow>
                                )}
                            </div>
                            {hook.plugin.description && (
                                <p className="mt-3 text-xs text-muted-foreground">
                                    {hook.plugin.description}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {hook.project && (
                    <Card className="rounded-sm">
                        <CardHeader>
                            <CardTitle className="text-base">{t.detail.project}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="text-sm">{hook.project.name}</div>
                            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                                {hook.project.path}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
