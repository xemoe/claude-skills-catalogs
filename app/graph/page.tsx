import { RelationGraph } from "@/components/relation-graph";
import { InlineCode } from "@/components/inline-code";
import { buildRelationGraph } from "@/lib/relations";

export const dynamic = "force-dynamic";

function EmptyState() {
  return (
    <div className="rounded-none border border-dashed p-12 text-center">
      <h3 className="text-base font-medium">Nothing to graph yet</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
        No skills or commands were discovered, so there are no relationships to
        draw. Deploy a skill or add a command file, then press{" "}
        <InlineCode>Rescan</InlineCode>.
      </p>
    </div>
  );
}

export default function GraphPage() {
  const graph = buildRelationGraph();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relationship Graph</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How your deployed skills and commands fit together — clustered
            around the plugin or project that bundles them, and linked wherever
            one names another. Hover a node to trace its connections; click to
            open it.
          </p>
        </div>
        <p className="tabular-nums text-xs text-muted-foreground">
          {graph.stats.skills} skills · {graph.stats.commands} commands ·{" "}
          {graph.stats.clusters} clusters · {graph.stats.references} references
        </p>
      </div>

      {graph.nodes.length === 0 ? <EmptyState /> : <RelationGraph graph={graph} />}
    </div>
  );
}
