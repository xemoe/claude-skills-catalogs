import path from "path";
import { notFound } from "next/navigation";
import { FileText, Package } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { getCommandById } from "@/lib/command-scanner";
import { parseCommandMd } from "@/lib/command-parser";
import { stripBom } from "@/lib/frontmatter";
import { lastCommitDate } from "@/lib/git";
import { Markdown } from "@/components/markdown";
import { SkillMdViewer } from "@/components/skill-md-viewer";
import { SkillDescription } from "@/components/skill-description";
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const command = getCommandById(id);
  if (!command) notFound();

  const parsed = parseCommandMd(command.path);
  const rawCommandMd = stripBom(parsed.raw);
  const committedAt = command.source.repoRoot
    ? lastCommitDate(command.source.repoRoot, command.path)
    : null;
  const fileName = path.basename(command.path);
  const invocation = `/${command.name}${
    command.argumentHint ? ` ${command.argumentHint}` : ""
  }`;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-bold tracking-tight">
            /{command.name}
          </h1>
          <SkillTypeBadge type={command.scope} />
        </div>
        {command.description?.trim() && (
          <SkillDescription description={command.description} />
        )}
        <div className="flex items-start gap-2">
          <code className="min-w-0 flex-1 break-all rounded-none bg-secondary p-2 font-mono text-xs">
            {invocation}
          </code>
          <CopyButton value={invocation} />
        </div>
      </div>

      <Card className="min-w-0">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardAction>
            <MetaRow label="Last modified">
              <span title={formatDate(command.lastUpdated)}>
                {formatRelativeTime(command.lastUpdated)}
              </span>
            </MetaRow>
          </CardAction>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileText className="h-4 w-4" /> {fileName}
          </CardTitle>
        </CardHeader>
        <Separator className="border-b border-dotted border-gray-200" />
        <CardContent>
          {rawCommandMd ? (
            <SkillMdViewer
              raw={rawCommandMd}
              copyLabel={fileName}
              preview={
                parsed.body ? (
                  <Markdown content={parsed.body} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This command file has no body content.
                  </p>
                )
              }
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              This command file could not be read.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y">
              <MetaRow label="Source">
                <span className="flex min-w-0 items-center justify-end gap-1">
                  <SourceBadge source={command.source} />
                  <CopyButton
                    value={command.source.url ?? command.source.label}
                    size="icon-xs"
                    className="shrink-0"
                  />
                </span>
              </MetaRow>
              {command.source.branch && (
                <MetaRow label="Branch">
                  <span className="font-mono text-xs">
                    {command.source.branch}
                  </span>
                </MetaRow>
              )}
              <MetaRow label="Last modified">
                <span title={formatDate(command.lastUpdated)}>
                  {formatRelativeTime(command.lastUpdated)}
                </span>
              </MetaRow>
              {committedAt && (
                <MetaRow label="Last commit">
                  <span title={formatDate(committedAt)}>
                    {formatRelativeTime(committedAt)}
                  </span>
                </MetaRow>
              )}
              <MetaRow label="Size">{formatBytes(command.sizeBytes)}</MetaRow>
              {command.namespace && (
                <MetaRow label="Namespace">
                  <span className="font-mono text-xs">{command.namespace}</span>
                </MetaRow>
              )}
              {command.argumentHint && (
                <MetaRow label="Argument hint">
                  <span className="font-mono text-xs">
                    {command.argumentHint}
                  </span>
                </MetaRow>
              )}
              {command.model && (
                <MetaRow label="Model">
                  <span className="font-mono text-xs">{command.model}</span>
                </MetaRow>
              )}
              <MetaRow label="Model invocation">
                {command.disableModelInvocation
                  ? "Disabled (slash-only)"
                  : "Enabled"}
              </MetaRow>
              {command.allowedTools && (
                <MetaRow label="Allowed tools">
                  <span className="font-mono text-xs">
                    {command.allowedTools}
                  </span>
                </MetaRow>
              )}
            </div>
          </CardContent>
        </Card>

        {command.plugin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" /> Plugin
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y">
                <MetaRow label="Name">{command.plugin.name}</MetaRow>
                {command.plugin.version && (
                  <MetaRow label="Version">
                    <span className="font-mono text-xs">
                      {command.plugin.version}
                    </span>
                  </MetaRow>
                )}
                {command.plugin.author && (
                  <MetaRow label="Author">{command.plugin.author}</MetaRow>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm">{command.project.name}</div>
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                {command.project.path}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Location on disk</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-start gap-2">
              <code className="min-w-0 flex-1 break-all rounded-none bg-secondary p-2 text-xs">
                {command.path}
              </code>
              <CopyButton value={command.path} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
