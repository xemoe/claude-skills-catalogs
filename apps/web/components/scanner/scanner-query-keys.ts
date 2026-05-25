// Query keys for the filesystem scanners (skills + commands).
// Kept in a non-"use client" module so Server Components can import them
// to prefetch into a per-request QueryClient via HydrationBoundary.

export const scannerQk = {
    skills: () => ["scanner", "skills"] as const,
    commands: () => ["scanner", "commands"] as const,
};

/** Shared prefix used to invalidate every scanner query at once. */
export const SCANNER_QUERY_PREFIX = ["scanner"] as const;
