import { notFound } from "next/navigation";
import { FileText, Package } from "lucide-react";
import { getSkillById } from "@/lib/scanner";
import { parseSkillMd } from "@/lib/skill-parser";
import { lastCommitDate } from "@/lib/git";
import { Markdown } from "@/components/markdown";
import { SkillMdViewer } from "@/components/skill-md-viewer";
import { SkillDescription } from "@/components/skill-description";
import { SkillTypeBadge } from "@/components/skill-type-badge";
import { SourceBadge } from "@/components/source-badge";
import { CopyButton } from "@/components/copy-button";
import {
  Card,
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

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const skill = getSkillById(id);
  if (!skill) notFound();

  const parsed = parseSkillMd(skill.skillMdPath);
  const rawSkillMd =
    parsed.raw.charCodeAt(0) === 0xfeff ? parsed.raw.slice(1) : parsed.raw;
  const committedAt = skill.source.repoRoot
    ? lastCommitDate(skill.source.repoRoot, skill.path)
    : null;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{skill.name}</h1>
          <SkillTypeBadge type={skill.type} />
        </div>
        {skill.description?.trim() && (
          <SkillDescription description={skill.description} />
        )}
      </div>

      <Card className="min-w-0">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> SKILL.md
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rawSkillMd ? (
            <SkillMdViewer
              raw={rawSkillMd}
              preview={
                parsed.body ? (
                  <Markdown content={parsed.body} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This SKILL.md has no body content.
                  </p>
                )
              }
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              This SKILL.md could not be read.
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
                  <SourceBadge source={skill.source} />
                  <CopyButton
                    value={skill.source.url ?? skill.source.label}
                    className="h-6 w-6 shrink-0"
                  />
                </span>
              </MetaRow>
              {skill.source.branch && (
                <MetaRow label="Branch">
                  <span className="font-mono text-xs">
                    {skill.source.branch}
                  </span>
                </MetaRow>
              )}
              <MetaRow label="Last modified">
                <span title={formatDate(skill.lastUpdated)}>
                  {formatRelativeTime(skill.lastUpdated)}
                </span>
              </MetaRow>
              {committedAt && (
                <MetaRow label="Last commit">
                  <span title={formatDate(committedAt)}>
                    {formatRelativeTime(committedAt)}
                  </span>
                </MetaRow>
              )}
              <MetaRow label="Files">{skill.fileCount}</MetaRow>
              <MetaRow label="Size">{formatBytes(skill.sizeBytes)}</MetaRow>
              <MetaRow label="Used">
                {skill.usage ? `${skill.usage.usageCount}×` : "never"}
              </MetaRow>
              {skill.usage?.lastUsedAt ? (
                <MetaRow label="Last used">
                  {formatRelativeTime(skill.usage.lastUsedAt)}
                </MetaRow>
              ) : null}
              {skill.allowedTools && (
                <MetaRow label="Allowed tools">
                  <span className="font-mono text-xs">
                    {skill.allowedTools}
                  </span>
                </MetaRow>
              )}
            </div>
          </CardContent>
        </Card>

        {skill.plugin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" /> Plugin
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y">
                <MetaRow label="Name">{skill.plugin.name}</MetaRow>
                {skill.plugin.version && (
                  <MetaRow label="Version">
                    <span className="font-mono text-xs">
                      {skill.plugin.version}
                    </span>
                  </MetaRow>
                )}
                {skill.plugin.author && (
                  <MetaRow label="Author">{skill.plugin.author}</MetaRow>
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

        {skill.project && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm">{skill.project.name}</div>
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                {skill.project.path}
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
              <code className="min-w-0 flex-1 break-all rounded bg-secondary p-2 text-xs">
                {skill.path}
              </code>
              <CopyButton value={skill.path} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
