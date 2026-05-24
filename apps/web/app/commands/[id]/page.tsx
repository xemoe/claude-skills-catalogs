import path from "path";
import {notFound} from "next/navigation";
import {ChevronRight, FileText, Package, Workflow} from "lucide-react";
import Link from "next/link";
import {Separator} from "@/components/ui/separator";
import {getCommandById} from "@lector/core/command-scanner";
import {parseCommandMd} from "@lector/core/command-parser";
import {extractPipeline} from "@lector/core/pipeline";
import {stripBom} from "@lector/core/frontmatter";
import {lastCommitDate} from "@lector/core/git";
import {Markdown} from "@/components/markdown";
import {SkillMdViewer} from "@/components/skill-md-viewer";
import {NodePipeline} from "@/components/node-pipeline";
import {SkillDescription} from "@/components/skill-description";
import {SkillTypeBadge} from "@/components/skill-type-badge";
import {SourceBadge} from "@/components/source-badge";
import {ModelInvocationBadge} from "@/components/model-invocation-badge";
import {ModelInvocationExamples} from "@/components/model-invocation-examples";
import {CopyButton} from "@/components/copy-button";
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {formatBytes, formatDate, formatRelativeTime} from "@/lib/utils";
import {getServerI18n} from "@/lib/i18n/server";
import {getPreset} from "@lector/presets/presets";
import {parsePresetId} from "@/lib/preset-query";

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

export default async function CommandDetailPage({
                                                    params,
                                                    searchParams,
                                                }: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ preset?: string }>;
}) {
    const {id} = await params;
    const {preset: presetParam} = await searchParams;
    const {t, locale} = await getServerI18n();
    const command = getCommandById(id);
    if (!command) notFound();

    const presetId = parsePresetId(presetParam);
    const preset = presetId != null ? getPreset(presetId) : null;

    const parsed = parseCommandMd(command.path);
    const pipeline = extractPipeline(parsed.body);
    const rawCommandMd = stripBom(parsed.raw);
    const committedAt = command.source.repoRoot
        ? lastCommitDate(command.source.repoRoot, command.path)
        : null;
    const fileName = path.basename(command.path);
    const invocation = `/${command.name}${
        command.argumentHint ? ` ${command.argumentHint}` : ""
    }`;

    return (
        <div className="space-y-4">

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="font-mono text-2xl font-bold tracking-tight">
                            /{command.name}
                        </h1>
                        <SkillTypeBadge type={command.scope}/>
                    </div>
                    {preset && (
                        <div className="">
                            <Link
                                href={`/commands?preset=${preset.id}`}
                                className="flex inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                                {t.detail.backToPreset(preset.name)}
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    )}
                </div>
                
                {command.description?.trim() && (
                    <SkillDescription description={command.description}/>
                )}

            </div>

            <Card className="min-w-0 rounded-sm">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardAction>
                        <MetaRow label={t.detail.lastModified}>
                            <span title={formatDate(command.lastUpdated)}>
                                {formatRelativeTime(command.lastUpdated, locale)}
                            </span>
                        </MetaRow>
                    </CardAction>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <FileText className="h-4 w-4"/> {fileName}
                    </CardTitle>
                </CardHeader>
                <Separator className="border-b border-dotted border-gray-200"/>
                <CardContent>
                    {rawCommandMd ? (
                        <SkillMdViewer
                            raw={rawCommandMd}
                            copyLabel={fileName}
                            preview={
                                parsed.body ? (
                                    <Markdown content={parsed.body}/>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        {t.detail.commandNoBody}
                                    </p>
                                )
                            }
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {t.detail.commandUnreadable}
                        </p>
                    )}
                </CardContent>
            </Card>

            {pipeline.steps.length >= 2 && (
                <Card className={'rounded-sm'}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Workflow className="h-4 w-4"/> {t.detail.pipeline}
                            <span className="text-xs font-normal text-muted-foreground">
                                {pipeline.kind === "steps"
                                    ? t.detail.workflowSteps
                                    : t.detail.sectionOutline}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <NodePipeline pipeline={pipeline}/>
                    </CardContent>
                </Card>
            )}

            <ModelInvocationExamples
                name={command.name}
                filePath={command.path}
                type={command.scope}
                disabled={command.disableModelInvocation}
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
                            {command.path}
                        </code>
                        <CopyButton value={command.path}/>
                    </div>
                </CardContent>
            </Card>

            <div className="grid items-start gap-6 grid-cols-2">
                <Card className={'rounded-sm'}>
                    <CardHeader>
                        <CardTitle className="text-base">{t.detail.details}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="divide-y">
                            <MetaRow label={t.detail.source}>
                                <span className="flex min-w-0 items-center justify-end gap-1">
                                    <SourceBadge source={command.source}/>
                                    <CopyButton
                                        value={command.source.url ?? command.source.label}
                                        size="icon-xs"
                                        className="shrink-0"
                                    />
                                </span>
                            </MetaRow>
                            {command.source.branch && (
                                <MetaRow label={t.detail.branch}>
                                    <span className="font-mono text-xs">
                                        {command.source.branch}
                                    </span>
                                </MetaRow>
                            )}
                            <MetaRow label={t.detail.lastModified}>
                                <span title={formatDate(command.lastUpdated)}>
                                    {formatRelativeTime(command.lastUpdated, locale)}
                                </span>
                            </MetaRow>
                            {committedAt && (
                                <MetaRow label={t.detail.lastCommit}>
                                    <span title={formatDate(committedAt)}>
                                        {formatRelativeTime(committedAt, locale)}
                                    </span>
                                </MetaRow>
                            )}
                            <MetaRow label={t.detail.size}>
                                {formatBytes(command.sizeBytes)}
                            </MetaRow>
                            {command.namespace && (
                                <MetaRow label={t.detail.namespace}>
                                    <span className="font-mono text-xs">{command.namespace}</span>
                                </MetaRow>
                            )}
                            {command.argumentHint && (
                                <MetaRow label={t.detail.argumentHint}>
                                    <span className="font-mono text-xs">
                                        {command.argumentHint}
                                    </span>
                                </MetaRow>
                            )}
                            {command.model && (
                                <MetaRow label={t.detail.model}>
                                    <span className="font-mono text-xs">{command.model}</span>
                                </MetaRow>
                            )}
                            <MetaRow label={t.detail.modelInvocation}>
                                <ModelInvocationBadge
                                    disabled={command.disableModelInvocation}
                                />
                            </MetaRow>
                            {command.allowedTools && (
                                <MetaRow label={t.detail.allowedTools}>
                                    <span className="font-mono text-xs">
                                        {command.allowedTools}
                                    </span>
                                </MetaRow>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {command.plugin && (
                    <Card className={'rounded-sm'}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Package className="h-4 w-4"/> {t.detail.plugin}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="divide-y">
                                <MetaRow label={t.detail.name}>{command.plugin.name}</MetaRow>
                                {command.plugin.version && (
                                    <MetaRow label={t.detail.version}>
                                        <span className="font-mono text-xs">
                                            {command.plugin.version}
                                        </span>
                                    </MetaRow>
                                )}
                                {command.plugin.author && (
                                    <MetaRow label={t.detail.author}>
                                        {command.plugin.author}
                                    </MetaRow>
                                )}
                            </div>
                            {command.plugin.description && (
                                <p className="mt-3 text-xs text-muted-foreground">
                                    {command.plugin.description}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {command.project && (
                    <Card className={'rounded-sm'}>
                        <CardHeader>
                            <CardTitle className="text-base">{t.detail.project}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="text-sm">{command.project.name}</div>
                            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                                {command.project.path}
                            </p>
                        </CardContent>
                    </Card>
                )}

            </div>
        </div>
    );
}
