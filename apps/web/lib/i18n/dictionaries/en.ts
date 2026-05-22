import type { ScanRootLabelKey, SkillType } from "@lector/core/types";

/**
 * The English dictionary is the canonical shape — `Dictionary` is `typeof en`,
 * and every other locale must match it exactly.
 */
export const en = {
    meta: {
        title: "Skills Lector",
        description: "Browse and inspect deployed Claude Skills on this machine.",
    },

    nav: {
        brand: "Skills Lector",
        skills: "Skills",
        commands: "Commands",
        analytics: "Analytics",
        graph: "Graph",
        sources: "Sources",
    },

    language: {
        label: "Language",
    },

    theme: {
        toLight: "Switch to light mode",
        toDark: "Switch to dark mode",
    },

    actions: {
        rescan: "Rescan",
        scanning: "Scanning…",
        copy: "Copy",
        copied: "Copied",
        copyToClipboard: "Copy to clipboard",
        showMore: "Show more",
        showLess: "Show less",
        previous: "Previous",
        next: "Next",
    },

    common: {
        never: "never",
        unknown: "unknown",
        justNow: "just now",
        loadingGraph: "Loading graph…",
        loadingPipeline: "Loading pipeline…",
        allProjects: "All projects",
        filterByProject: "Filter by project",
        page: (current: number, total: number) => `Page ${current} of ${total}`,
    },

    /** Deployment type/scope labels — shared by skills and commands. */
    skillTypes: {
        personal: "Personal",
        plugin: "Plugin",
        project: "Project",
        local: "Local",
    } as Record<SkillType, string>,

    scan: {
        line: (date: string, ms: number, platform: string) =>
            `Scanned ${date} · ${ms} ms · ${platform}`,
        transcripts: (date: string, count: number) =>
            `Scanned ${date} · ${count} transcripts`,
        errors: (count: number) =>
            `${count} path(s) could not be read during the scan`,
    },

    dashboard: {
        title: "Deployed Skills",
        subtitle:
            "Every Claude Skill discovered on this machine — where it lives, where it came from, and when it last changed.",
        emptyTitle: "No skills found",
        empty1: "Nothing was discovered under ",
        empty2:
            " or the other default scan locations. Point the scanner at a directory by adding an ",
        empty3: " entry to ",
        empty4: ", then press Rescan.",
    },

    commandsPage: {
        title: "Deployed Commands",
        subtitle:
            "Every Claude Code slash command discovered on this machine — where it lives, where it came from, and when it last changed.",
        emptyTitle: "No commands found",
        empty1: "No slash-command ",
        empty2: " files were discovered under ",
        empty3: ", installed plugins, or known project ",
        empty4: " directories. Add a command file and press Rescan.",
    },

    explorer: {
        searchSkills: "Search skills, plugins, sources…",
        searchCommands: "Search commands, plugins, sources…",
        tabAll: "All",
        sortRecent: "Recently updated",
        sortName: "Name (A–Z)",
        sortUsage: "Most used",
        colSkill: "Skill",
        colCommand: "Command",
        colType: "Type",
        colScope: "Scope",
        colSource: "Source",
        colUpdated: "Last updated",
        colUsed: "Used",
        colInvocation: "Invocation",
        noSkillsMatch: "No skills match your filters.",
        noCommandsMatch: "No commands match your filters.",
        showingSkills: (start: number, end: number, total: number) =>
            `Showing ${start}–${end} of ${total} skills`,
        showingCommands: (start: number, end: number, total: number) =>
            `Showing ${start}–${end} of ${total} commands`,
        emptySkills: (total: number) => `0 of ${total} skills`,
        emptyCommands: (total: number) => `0 of ${total} commands`,
        pluginTitle: (name: string) => `Plugin: ${name}`,
        filterInvocation: "Filter by invocation",
        invocationAll: "All invocation",
        invocationModel: "Model-invocable",
        invocationSlashOnly: "Slash-only",
        invocationModelHint:
            "Model-invocable — Claude can invoke this automatically, no slash command needed",
        invocationSlashOnlyHint: "Slash-only — Claude will not auto-invoke it",
    },

    sidebar: {
        allSkills: "All skills",
        allCommands: "All commands",
        filterSkills: "Filter skills…",
        filterCommands: "Filter commands…",
        filterSkillsAria: "Filter skills",
        filterCommandsAria: "Filter commands",
        noSkillsMatch: "No skills match your filter.",
        noCommandsMatch: "No commands match your filter.",
    },

    stats: {
        totalSkills: "Total Skills",
        fromPlugins: "From Plugins",
        fromGitHub: "From GitHub",
        localOnly: "Local Only",
        totalCommands: "Total Commands",
        personal: "Personal",
        project: "Project",
        notTrackedInGit: "not tracked in git",
        availableEverywhere: "available everywhere",
        acrossLocations: (count: number) =>
            `across ${count} scanned location${count === 1 ? "" : "s"}`,
        pluginsInstalled: (count: number) =>
            `${count} plugin${count === 1 ? "" : "s"} installed`,
        pluginsShort: (count: number) =>
            `${count} plugin${count === 1 ? "" : "s"}`,
        repositories: (count: number) =>
            `${count} repositor${count === 1 ? "y" : "ies"}`,
        projectsCount: (count: number) =>
            `${count} project${count === 1 ? "" : "s"}`,
    },

    analyticsPage: {
        title: "Usage Analytics",
        subtitle:
            "Which skills and commands you actually reach for — and which you have forgotten. Reconstructed from your Claude Code session transcripts.",
        empty:
            "No skill or command invocations were found in any session transcript yet. Use a few skills and slash commands in Claude Code, then press Rescan.",
    },

    analytics: {
        windows: {
            "4h": { label: "4 Hours", long: "the last 4 hours" },
            "1d": { label: "24 Hours", long: "the last 24 hours" },
            "1w": { label: "7 Days", long: "the last 7 days" },
            all: { label: "All Time", long: "all recorded history" },
        },
        trackedInvocations: "Tracked Invocations",
        neverUsed: "Never Used",
        idle: "Idle 7+ Days",
        catalogCoverage: "Catalog Coverage",
        noActivityYet: "no activity recorded yet",
        acrossTranscripts: (count: number) => `across ${count} transcripts`,
        skillsCommandsBreakdown: (skills: number, commands: number) =>
            `${skills} skills · ${commands} commands`,
        coverageSub: (used: number, total: number) =>
            `${used}/${total} ever invoked`,
        mostUsed: "Most Used",
        invocationsIn: (count: number, windowLong: string) =>
            `${count} invocation${count === 1 ? "" : "s"} in ${windowLong}`,
        topSkills: "Top Skills",
        topCommands: "Top Commands",
        noSkillsIn: (windowLong: string) => `No skills used in ${windowLong}.`,
        noCommandsIn: (windowLong: string) => `No commands used in ${windowLong}.`,
        activityHeatmap: "Activity Heatmap",
        lastDays: (count: number) => `last ${count} days`,
        skills: "Skills",
        commands: "Commands",
        noSkillActivity: (count: number) =>
            `No skill activity in the last ${count} days.`,
        noCommandActivity: (count: number) =>
            `No command activity in the last ${count} days.`,
        noActivity: (count: number) => `No activity in the last ${count} days.`,
        reminders: "Reminders",
        remindersSub: "skills & commands worth a fresh look",
        neverUsedEmpty:
            "Every deployed skill and command has been used at least once.",
        idleEmpty: "Nothing has gone cold — everything was used recently.",
        lastUsedTooltip: (label: string) => `last used ${label}`,
        fromSourceTooltip: (source: string) => `from ${source}`,
        heatLess: "Less",
        heatMore: "More",
        heatCell: (name: string, day: string, count: number) =>
            `${name} — ${day}: ${count} use${count === 1 ? "" : "s"}`,
    },

    graphPage: {
        title: "Relationship Graph",
        subtitle:
            "How your deployed skills and commands fit together — clustered around the plugin or project that bundles them, and linked wherever one names another.",
        emptyTitle: "Nothing to graph yet",
        empty1:
            "No skills or commands were discovered, so there are no relationships to draw. Deploy a skill or add a command file, then press ",
        empty2: ".",
        statsLine: (
            skills: number,
            commands: number,
            clusters: number,
            references: number,
        ) =>
            `${skills} skills · ${commands} commands · ${clusters} clusters · ${references} references`,
    },

    graph: {
        all: "All",
        skills: "Skills",
        commands: "Commands",
        legend: "Legend",
        bundledTogether: "bundled together",
        references: "references",
        hubMeta: (kind: string, count: number) =>
            `${kind} · ${count} item${count === 1 ? "" : "s"}`,
        referencesBadge: (count: number) =>
            `Linked to ${count} other ${count === 1 ? "item" : "items"}`,
    },

    sources: {
        title: "Sources",
        subtitle:
            "Where your deployed skills come from — GitHub repositories, plugins, and local directories.",
        kinds: {
            github: "GitHub",
            git: "Git remote",
            local: "Local directory",
            plugin: "Plugin",
        },
        openRepository: "Open repository",
        skillCount: (count: number) => `${count} skill${count === 1 ? "" : "s"}`,
        noSources: "No sources found.",
        scanLocations: "Scan locations",
        scanLocationsDesc1:
            "Directories the catalog walks to discover SKILL.md files. Configure extra roots in ",
        scanLocationsDesc2: ".",
        colLocation: "Location",
        colPath: "Path",
        colType: "Type",
        colSkills: "Skills",
        rootLabel: (key: ScanRootLabelKey, arg?: string) => {
            switch (key) {
                case "personalSkills":
                    return "Personal skills";
                case "installedPlugins":
                    return "Installed plugins";
                case "coworkSkills":
                    return "Agent / Cowork skills";
                case "sampleSkills":
                    return "Bundled sample skills";
                case "customRoot":
                    return "Custom root";
                case "personalCommands":
                    return "Personal commands";
                case "project":
                    return `Project: ${arg ?? ""}`;
                case "plugin":
                    return `Plugin: ${arg ?? ""}`;
            }
        },
        rootKinds: {
            personal: "Personal",
            plugin: "Plugin",
            project: "Project",
            local: "Local",
            auto: "Auto",
        } as Record<SkillType | "auto", string>,
    },

    detail: {
        lastModified: "Last modified",
        source: "Source",
        branch: "Branch",
        lastCommit: "Last commit",
        files: "Files",
        size: "Size",
        used: "Used",
        lastUsed: "Last used",
        allowedTools: "Allowed tools",
        name: "Name",
        version: "Version",
        author: "Author",
        namespace: "Namespace",
        argumentHint: "Argument hint",
        model: "Model",
        modelInvocation: "Model invocation",
        pipeline: "Pipeline",
        workflowSteps: "workflow steps",
        sectionOutline: "section outline",
        details: "Details",
        plugin: "Plugin",
        project: "Project",
        locationOnDisk: "Location on disk",
        skillNoBody: "This SKILL.md has no body content.",
        skillUnreadable: "This SKILL.md could not be read.",
        commandNoBody: "This command file has no body content.",
        commandUnreadable: "This command file could not be read.",
        usedTimes: (count: number) => `${count}×`,
    },

    viewer: {
        preview: "Preview",
        raw: "Raw",
        copy: "Copy",
        copied: "Copied",
        copyRaw: (file: string) => `Copy raw ${file} to clipboard`,
    },
};

export type Dictionary = typeof en;
