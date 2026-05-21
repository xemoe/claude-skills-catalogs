import { Boxes, FolderOpen, Github, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ScanResult } from "@/lib/types";

export function StatCards({ result }: { result: ScanResult }) {
  const { skills, roots } = result;

  const pluginSkills = skills.filter((s) => s.type === "plugin");
  const distinctPlugins = new Set(
    skills.filter((s) => s.plugin).map((s) => s.plugin!.name),
  ).size;
  const githubSkills = skills.filter((s) => s.source.kind === "github");
  const distinctRepos = new Set(githubSkills.map((s) => s.source.label)).size;
  const localSkills = skills.filter((s) => s.source.kind === "local");

  const cards = [
    {
      label: "Total Skills",
      value: skills.length,
      sub: `across ${roots.length} scanned location${roots.length === 1 ? "" : "s"}`,
      Icon: Boxes,
    },
    {
      label: "From Plugins",
      value: pluginSkills.length,
      sub: `${distinctPlugins} plugin${distinctPlugins === 1 ? "" : "s"} installed`,
      Icon: Package,
    },
    {
      label: "From GitHub",
      value: githubSkills.length,
      sub: `${distinctRepos} repositor${distinctRepos === 1 ? "y" : "ies"}`,
      Icon: Github,
    },
    {
      label: "Local Only",
      value: localSkills.length,
      sub: "not tracked in git",
      Icon: FolderOpen,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, sub, Icon }) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-secondary p-2.5">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold tabular-nums">{value}</div>
              <div className="text-sm font-medium">{label}</div>
              <div className="truncate text-xs text-muted-foreground">{sub}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
