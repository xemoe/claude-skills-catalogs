import { AlertTriangle } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { HookStatCards } from "@/components/hook-stat-cards";
import { HooksExplorer } from "@/components/hooks-explorer";
import { InlineCode } from "@/components/inline-code";
import { scanHooks } from "@lector/core/hook-scanner";
import { formatDate } from "@/lib/utils";
import { getServerI18n } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

const EXAMPLE_HOOKS_JSON = `{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "echo 'about to run a bash command'" }
        ]
      },
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          { "type": "command", "command": "node ./scripts/log-edit.mjs", "timeout": 5 }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "npx --yes prettier --write {{TOOL_INPUT.file_path}}" }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "echo \\"prompt: $CLAUDE_USER_PROMPT\\" >> ~/.claude/prompts.log" }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "echo 'session stopping'" }
        ]
      }
    ]
  }
}`;

function EmptyState({ t }: { t: Dictionary }) {
    return (
        <div className="rounded-none border border-dashed p-8 sm:p-12">
            <div className="text-center">
                <h3 className="text-base font-medium">{t.hooksPage.emptyTitle}</h3>
                <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                    {t.hooksPage.empty1}
                    <InlineCode>hooks</InlineCode>
                    {t.hooksPage.empty2}
                    <InlineCode>~/.claude/settings.json</InlineCode>
                    {t.hooksPage.empty3}
                    <InlineCode>.claude/settings.json</InlineCode>
                    {t.hooksPage.empty4}
                </p>
            </div>

            <div className="mx-auto mt-8 max-w-3xl space-y-3 text-left">
                <h4 className="text-sm font-semibold">
                    {t.hooksPage.exampleHeading}
                </h4>
                <p className="text-xs text-muted-foreground">
                    {t.hooksPage.exampleIntro}
                </p>
                <div className="relative">
                    <pre className="overflow-x-auto rounded-none border bg-secondary/60 p-4 pr-12 font-mono text-xs leading-relaxed">
                        {EXAMPLE_HOOKS_JSON}
                    </pre>
                    <CopyButton
                        value={EXAMPLE_HOOKS_JSON}
                        className="absolute right-2 top-2"
                    />
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>
                        {t.hooksPage.exampleInstallPersonal}
                        <InlineCode>~/.claude/settings.json</InlineCode>
                    </li>
                    <li>
                        {t.hooksPage.exampleInstallProject}
                        <InlineCode>{"<project>/.claude/settings.json"}</InlineCode>
                    </li>
                    <li>
                        {t.hooksPage.exampleInstallLocal}
                        <InlineCode>{"<project>/.claude/settings.local.json"}</InlineCode>
                    </li>
                </ul>
            </div>
        </div>
    );
}

export default async function HooksPage() {
    const { t } = await getServerI18n();
    const result = scanHooks();

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {t.hooksPage.title}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t.hooksPage.subtitle}
                    </p>
                </div>
                <p className="tabular-nums text-xs text-muted-foreground">
                    {t.scan.line(
                        formatDate(result.scannedAt),
                        result.durationMs,
                        result.platform,
                    )}
                </p>
            </div>

            <HookStatCards result={result} />

            {result.hooks.length === 0 ? (
                <EmptyState t={t} />
            ) : (
                <HooksExplorer hooks={result.hooks} />
            )}

            {result.errors.length > 0 && (
                <details className="rounded-none border border-amber-300 bg-amber-50 p-3 text-xs">
                    <summary className="flex cursor-pointer items-center gap-2 text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t.scan.errors(result.errors.length)}
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
