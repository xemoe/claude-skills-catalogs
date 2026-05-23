// apps/web/components/presets/use-preset-queries.ts
"use client";

import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import type {
    ApplyResult,
    ItemKind,
    PinnedItem,
    Preset,
    PresetItem,
    ApplyLog,
    ActiveState,
} from "@lector/presets/types";

import { qk } from "./preset-query-keys";

// Re-export so existing client-side imports keep working.
export { qk };

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
}

// --- Queries ---

export function usePresetsList(status: "active" | "archived" | "all" = "active") {
    return useQuery({
        queryKey: qk.presets(status),
        queryFn: () =>
            jsonFetch<{ presets: Preset[]; active: ActiveState }>(
                `/api/presets?status=${status}`,
            ),
    });
}

export function usePreset(id: number) {
    return useQuery({
        queryKey: qk.preset(id),
        queryFn: () =>
            jsonFetch<{ preset: Preset; items: PresetItem[] }>(`/api/presets/${id}`),
    });
}

export function usePinnedList(status: "active" | "archived" | "all" = "active") {
    return useQuery({
        queryKey: qk.pinned(status),
        queryFn: () => jsonFetch<{ pinned: PinnedItem[] }>(`/api/presets/pin?status=${status}`),
    });
}

export function useApplyLog(presetId?: number) {
    return useQuery({
        queryKey: qk.applyLog(presetId),
        queryFn: () => {
            const qs = presetId ? `?presetId=${presetId}` : "";
            return jsonFetch<{ logs: ApplyLog[] }>(`/api/presets/log${qs}`);
        },
    });
}

// --- Mutations ---

type CreatePresetVars = {
    slug: string;
    name: string;
    description?: string | null;
    color?: string | null;
};

export function useCreatePreset() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: CreatePresetVars) =>
            jsonFetch<{ preset: Preset }>(`/api/presets`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(vars),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["presets"] });
        },
    });
}

type UpdatePresetVars = {
    id: number;
    name?: string;
    description?: string | null;
    color?: string | null;
    slug?: string;
};

export function useUpdatePreset() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...rest }: UpdatePresetVars) =>
            jsonFetch<{ preset: Preset }>(`/api/presets/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(rest),
            }),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: qk.preset(vars.id) });
            qc.invalidateQueries({ queryKey: ["presets"] });
        },
    });
}

export function useArchivePreset() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) =>
            jsonFetch<{ preset: Preset }>(`/api/presets/${id}/archive`, { method: "POST" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["presets"] });
            qc.invalidateQueries({ queryKey: ["active-preset"] });
        },
    });
}

export function useUnarchivePreset() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) =>
            jsonFetch<{ preset: Preset }>(`/api/presets/${id}/unarchive`, { method: "POST" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["presets"] });
        },
    });
}

export function useAddPresetItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: { presetId: number; kind: ItemKind; identifier: string }) =>
            jsonFetch<{ item: PresetItem }>(`/api/presets/${vars.presetId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kind: vars.kind, identifier: vars.identifier }),
            }),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: qk.preset(vars.presetId) });
        },
    });
}

export function useRemovePresetItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: { presetId: number; kind: ItemKind; identifier: string }) =>
            jsonFetch<{ ok: true }>(
                `/api/presets/${vars.presetId}/items?kind=${vars.kind}&identifier=${encodeURIComponent(vars.identifier)}`,
                { method: "DELETE" },
            ),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: qk.preset(vars.presetId) });
        },
    });
}

export function useActivatePresetJson() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: { id: number; dryRun?: boolean; force?: boolean }) => {
            const qs = new URLSearchParams();
            if (vars.dryRun) qs.set("dryRun", "1");
            if (vars.force) qs.set("force", "1");
            return jsonFetch<{ result: ApplyResult }>(
                `/api/presets/${vars.id}/activate?${qs.toString()}`,
                { method: "POST" },
            );
        },
        onSuccess: (_data, vars) => {
            if (vars.dryRun) return;
            qc.invalidateQueries({ queryKey: ["presets"] });
            qc.invalidateQueries({ queryKey: ["active-preset"] });
            qc.invalidateQueries({ queryKey: ["apply-log"] });
            qc.invalidateQueries({ queryKey: qk.preset(vars.id) });
        },
    });
}

export function useAddPin() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: { kind: ItemKind; identifier: string; reason?: string | null }) =>
            jsonFetch<{ item: PinnedItem }>(`/api/presets/pin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(vars),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pinned"] });
        },
    });
}

export function useArchivePin() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: { kind: ItemKind; identifier: string }) =>
            jsonFetch<{ ok: true }>(
                `/api/presets/pin/${vars.kind}/${encodeURIComponent(vars.identifier)}/archive`,
                { method: "POST" },
            ),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pinned"] });
        },
    });
}

export function useUnarchivePin() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: { kind: ItemKind; identifier: string }) =>
            jsonFetch<{ ok: true }>(
                `/api/presets/pin/${vars.kind}/${encodeURIComponent(vars.identifier)}/unarchive`,
                { method: "POST" },
            ),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pinned"] });
        },
    });
}
