// Query keys for TanStack Query — extracted from use-preset-queries.ts
// so Server Components can import them without crossing a "use client" boundary
// (a "use client" module's exports become opaque references on the server).

export const qk = {
    presets: (status: "active" | "archived" | "all" = "active") =>
        ["presets", { status }] as const,
    preset: (id: number) => ["preset", id] as const,
    activeState: () => ["active-preset"] as const,
    pinned: (status: "active" | "archived" | "all" = "active") =>
        ["pinned", { status }] as const,
    applyLog: (presetId?: number) => ["apply-log", { presetId }] as const,
    applyLogItems: (logId: number) => ["apply-log-items", logId] as const,
};
