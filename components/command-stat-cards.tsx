import { FolderGit2, Package, SquareTerminal, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { CommandScanResult } from "@/lib/types";

export function CommandStatCards({ result }: { result: CommandScanResult }) {
  const { commands, roots } = result;

  const pluginCommands = commands.filter((c) => c.scope === "plugin");
  const distinctPlugins = new Set(
    commands.filter((c) => c.plugin).map((c) => c.plugin!.name),
  ).size;
  const personalCommands = commands.filter((c) => c.scope === "personal");
  const projectCommands = commands.filter((c) => c.scope === "project");
  const distinctProjects = new Set(
    commands.filter((c) => c.project).map((c) => c.project!.path),
  ).size;

  const cards = [
    {
      label: "Total Commands",
      value: commands.length,
      sub: `across ${roots.length} scanned location${roots.length === 1 ? "" : "s"}`,
      Icon: SquareTerminal,
    },
    {
      label: "From Plugins",
      value: pluginCommands.length,
      sub: `${distinctPlugins} plugin${distinctPlugins === 1 ? "" : "s"}`,
      Icon: Package,
    },
    {
      label: "Personal",
      value: personalCommands.length,
      sub: "available everywhere",
      Icon: User,
    },
    {
      label: "Project",
      value: projectCommands.length,
      sub: `${distinctProjects} project${distinctProjects === 1 ? "" : "s"}`,
      Icon: FolderGit2,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, sub, Icon }) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-none bg-secondary p-2.5">
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
