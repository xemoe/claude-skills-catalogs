import { notFound } from "next/navigation";
import { ChevronRight, FileText, Package, Workflow } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator"
import { getSkillById } from "@lector/core/scanner";
import { parseSkillMd } from "@lector/core/skill-parser";
import { extractPipeline } from "@lector/core/pipeline";
import { lastCommitDate } from "@lector/core/git";
import { Markdown } from "@/components/markdown";
import { SkillMdViewer } from "@/components/skill-md-viewer";
import { NodePipeline } from "@/components/node-pipeline";
import { SkillDescription } from "@/components/skill-description";
import { SkillTypeBadge } from "@/components/skill-type-badge";
import { SourceBadge } from "@/components/source-badge";
import { ModelInvocationBadge } from "@/components/model-invocation-badge";
import { ModelInvocationExamples } from "@/components/model-invocation-examples";
import { CopyButton } from "@/components/copy-button";
import {
    Card,
    CardContent,
    CardAction,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { formatBytes, formatDate, formatRelativeTime } from "@/lib/utils";
import { getServerI18n } from "@/lib/i18n/server";
import { getPreset } from "@lector/presets/presets";
import { parsePresetId } from "@/lib/preset-query";

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

export default async function SkillDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ preset?: string }>;
}) {
    const { id } = await params;
    const { preset: presetParam } = await searchParams;
    const { t, locale } = await getServerI18n();
    const skill = getSkillById(id);
    if (!skill) notFound();

    const presetId = parsePresetId(presetParam);
    const preset = presetId != null ? getPreset(presetId) : null;

    const parsed = parseSkillMd(skill.skillMdPath);
    const pipeline = extractPipeline(parsed.body);
    const rawSkillMd =
        parsed.raw.charCodeAt(0) === 0xfeff ? parsed.raw.slice(1) : parsed.raw;
    const committedAt = skill.source.repoRoot
        ? lastCommitDate(skill.source.repoRoot, skill.path)
        : null;

    return (
        <div className="space-y-4">

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">{skill.name}</h1>
                        <SkillTypeBadge type={skill.type} />
                    </div>
                    {preset && (
                        <div className="">
                            <Link
                                href={`/?preset=${preset.id}`}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                                {t.detail.backToPreset(preset.name)}
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    )}
                </div>

                {skill.description?.trim() && (
                    <SkillDescription description={skill.description} />
                )}

            </div>

            <Card className="min-w-0 rounded-sm">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardAction>
                        <MetaRow label={t.detail.lastModified}>
                                <span title={formatDate(skill.lastUpdated)}>
                                    {formatRelativeTime(skill.lastUpdated, locale)}
                                </span>
                        </MetaRow>
                    </CardAction>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <FileText className="h-4 w-4" /> SKILL.md
                    </CardTitle>
                </CardHeader>
                <Separator className={'border-b border-dotted border-gray-200'} />
                <CardContent>
                    {rawSkillMd ? (
                        <SkillMdViewer
                            raw={rawSkillMd}
                            preview={
                                parsed.body ? (
                                    <Markdown content={parsed.body} />
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        {t.detail.skillNoBody}
                                    </p>
                                )
                            }
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {t.detail.skillUnreadable}
                        </p>
                    )}
                </CardContent>
            </Card>

            {pipeline.steps.length >= 2 && (
                <Card className={'rounded-sm'}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Workflow className="h-4 w-4" /> {t.detail.pipeline}
                            <span className="text-xs font-normal text-muted-foreground">
                                {pipeline.kind === "steps"
                                    ? t.detail.workflowSteps
                                    : t.detail.sectionOutline}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <NodePipeline pipeline={pipeline} />
                    </CardContent>
                </Card>
            )}

            <ModelInvocationExamples
                name={skill.name}
                filePath={skill.skillMdPath}
                type={skill.type}
                disabled={skill.disableModelInvocation}
            />

            <Card className={'rounded-sm'}>
                <CardHeader>
                    <CardTitle className="text-base">
                        {t.detail.locationOnDisk}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex items-start gap-2">
                        <code className="min-w-0 flex-1 break-all rounded-none bg-secondary p-2 text-xs">
                            {skill.path}
                        </code>
                        <CopyButton value={skill.path} />
                    </div>
                </CardContent>
            </Card>

            <div className="grid items-start gap-6 sm:grid-cols-2 xl:grid-cols-2">
                <Card className={'rounded-sm'}>
                    <CardHeader>
                        <CardTitle className="text-base">{t.detail.details}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="divide-y">
                            <MetaRow label={t.detail.source}>
                                <span className="flex min-w-0 items-center justify-end gap-1">
                                    <SourceBadge source={skill.source} />
                                    <CopyButton
                                        value={skill.source.url ?? skill.source.label}
                                        size="icon-xs"
                                        className="shrink-0"
                                    />
                                </span>
                            </MetaRow>
                            {skill.source.branch && (
                                <MetaRow label={t.detail.branch}>
                                    <span className="font-mono text-xs">
                                        {skill.source.branch}
                                    </span>
                                </MetaRow>
                            )}
                            <MetaRow label={t.detail.lastModified}>
                                <span title={formatDate(skill.lastUpdated)}>
                                    {formatRelativeTime(skill.lastUpdated, locale)}
                                </span>
                            </MetaRow>
                            {committedAt && (
                                <MetaRow label={t.detail.lastCommit}>
                                    <span title={formatDate(committedAt)}>
                                        {formatRelativeTime(committedAt, locale)}
                                    </span>
                                </MetaRow>
                            )}
                            <MetaRow label={t.detail.files}>{skill.fileCount}</MetaRow>
                            <MetaRow label={t.detail.size}>
                                {formatBytes(skill.sizeBytes)}
                            </MetaRow>
                            <MetaRow label={t.detail.used}>
                                {skill.usage
                                    ? t.detail.usedTimes(skill.usage.usageCount)
                                    : t.common.never}
                            </MetaRow>
                            {skill.usage?.lastUsedAt ? (
                                <MetaRow label={t.detail.lastUsed}>
                                    {formatRelativeTime(skill.usage.lastUsedAt, locale)}
                                </MetaRow>
                            ) : null}
                            <MetaRow label={t.detail.modelInvocation}>
                                <ModelInvocationBadge
                                    disabled={skill.disableModelInvocation}
                                />
                            </MetaRow>
                            {skill.allowedTools && (
                                <MetaRow label={t.detail.allowedTools}>
                                    <span className="font-mono text-xs">
                                        {skill.allowedTools}
                                    </span>
                                </MetaRow>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {skill.project && (
                    <Card className={'rounded-sm'}>
                        <CardHeader>
                            <CardTitle className="text-base">{t.detail.project}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="text-sm">{skill.project.name}</div>
                            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                                {skill.project.path}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {skill.plugin && (
                    <Card className={'rounded-sm'}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Package className="h-4 w-4" /> {t.detail.plugin}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="divide-y">
                                <MetaRow label={t.detail.name}>{skill.plugin.name}</MetaRow>
                                {skill.plugin.version && (
                                    <MetaRow label={t.detail.version}>
                                        <span className="font-mono text-xs">
                                            {skill.plugin.version}
                                        </span>
                                    </MetaRow>
                                )}
                                {skill.plugin.author && (
                                    <MetaRow label={t.detail.author}>
                                        {skill.plugin.author}
                                    </MetaRow>
                                )}
                            </div>
                            {skill.plugin.description && (
                                <p className="mt-3 text-xs text-muted-foreground">
                                    {skill.plugin.description}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

            </div>
        </div>
    );
}
