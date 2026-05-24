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
        hooks: "Hooks",
        presets: "Presets",
        analytics: "Analytics",
        graph: "Graph",
        sources: "Sources",
        usecase: "Usecase",
        discover: "Discover",
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

    hooksPage: {
        title: "Configured Hooks",
        subtitle:
            "Every Claude Code hook declared on this machine — which lifecycle event it runs on, what command it executes, and which settings file declares it.",
        emptyTitle: "No hooks configured",
        empty1: "No ",
        empty2: " entries were found in personal ",
        empty3: ", plugin settings, or any known project's ",
        empty4: " files. Configure a hook with Claude Code's /hooks menu (or by hand-editing settings.json), then press Rescan.",
        unnamedMatcher: "(any)",
        exampleHeading: "Quick start — try this example",
        exampleIntro:
            "Sample hooks covering every category the stat cards above track. Copy the JSON into one of the settings files below, then press Rescan.",
        exampleCopyLabel: "example settings.json",
        exampleInstallPersonal: "Personal (every session): ",
        exampleInstallProject: "Project (committed): ",
        exampleInstallLocal: "Project-local (git-ignored): ",
    },

    presetsPage: {
        title: "Presets",
        subtitle: "Bundle skills and commands for different types of daily work.",
        newPreset: "New preset",
        rescan: "Refresh",
        activeCard: {
            active: "Active",
            itemsCount: (n: number) => `${n} items`,
            activated: (ago: string) => `activated ${ago}`,
            viewDetail: "View detail",
            reapply: "Re-apply",
        },
        tabs: {
            active: (n: number) => `Active (${n})`,
            archived: (n: number) => `Archived (${n})`,
        },
        pinnedPanel: {
            title: "Pinned (always on)",
            manage: "Manage",
            empty: "No pinned items yet.",
            add: "Add pinned",
        },
        empty: {
            heading: "Welcome — let's create your first preset.",
            body: "A preset is a bundle of skills and commands you want enabled for a type of work. Switching presets toggles each item's model-invocation flag — no other side effects.",
        },
        wizard: {
            stepName: "Name your workflow",
            stepItems: "Pick items",
            stepReview: "Review",
            namePlaceholder: "debugging",
            slugLabel: "Slug (URL-safe)",
            descPlaceholder: "What's this preset for?",
            cancel: "Cancel",
            next: "Next",
            back: "Back",
            save: "Save",
            saveAndActivate: "Save & Activate",
            review: {
                enabled: (n: number) => `Will enable (${n})`,
                disabled: (n: number) => `Will disable (${n})`,
                skipped: (n: number) => `Will skip (${n})`,
                missing: (n: number) => `Missing on disk (${n})`,
            },
        },
        detail: {
            edit: "Edit",
            activate: "Activate",
            archive: "Archive",
            unarchive: "Unarchive",
            addItem: "Add from catalog",
            skills: "Skills",
            commands: "Commands",
            recentActivations: "Recent activations",
            archivedBanner: "This preset is archived — read-only. Unarchive to edit or activate.",
            missingBadge: "missing on disk",
            removeItem: "Remove from preset",
            openSkill: "Open skill",
            openCommand: "Open command",
        },
        activate: {
            title: (name: string) => `Switch to "${name}"?`,
            cancel: "Cancel",
            apply: "Apply changes",
            progressTitle: (name: string) => `Activating "${name}"`,
            phaseScanning: "Scanning personal items…",
            phaseEnabling: (n: number, t: number, what: string) => `Enabling ${what} (${n} of ${t})…`,
            phaseDisabling: (n: number, t: number, what: string) => `Disabling ${what} (${n} of ${t})…`,
            phaseLogging: "Writing log…",
            toastSuccess: (e: number, d: number) => `Switched (${e} enabled, ${d} disabled)`,
            toastPartial: (errors: number) => `Applied with ${errors} errors — see log`,
            restartNote: "Restart Claude Code sessions to pick up the change. Existing sessions keep their current skills loaded.",
        },
        log: {
            title: "Apply history",
            empty: "No activations yet.",
            status: { success: "success", partial: "partial", failed: "failed" },
            cols: { ts: "When", from: "From", to: "To", enabled: "Enabled", disabled: "Disabled", skipped: "Skipped", errors: "Errors", status: "Status" },
        },
        errors: {
            slugCollision: (slug: string) => `Slug "${slug}" is already in use (active or archived).`,
            archivedActivate: "Cannot activate an archived preset. Unarchive first.",
            archivedEdit: "Cannot edit an archived preset.",
            generic: "Something went wrong.",
        },
    },

    discoverPage: {
        title: "Discover popular skills",
        subtitle:
            "Popular Claude-Skills repositories on GitHub, ranked by star count. The list is produced by the discover-popular-skills Claude Code skill and read from a local manifest — the web app makes no network calls.",
        emptyTitle: "No discovery run yet",
        empty1: "Run the ",
        empty2: " slash command in Claude Code (or invoke the ",
        empty3: " skill) to search GitHub for the most popular Claude-Skills repositories. The ranked top 10 lands at ",
        empty4: " at the repo root and appears here.",
        meta: {
            discoveredAt: "Discovered",
            auth: "Auth",
            queries: "Queries",
            entries: (count: number) =>
                `${count} ranked repositor${count === 1 ? "y" : "ies"}`,
            authGh: "GitHub CLI (gh)",
            authAnonymous: "Unauthenticated fetch",
        },
        rateLimited:
            "GitHub rate-limited at least one query during this run — the ranking may be partial. Authenticate with gh and re-run /discover-skills for a complete list.",
        readErrors: "The manifest could not be fully parsed:",
        colRank: "#",
        colRepo: "Repository",
        colStars: "Stars",
        colTopics: "Topics",
        colStatus: "Status",
        badgeVendored: "Vendored",
        badgeNotVendored: "Not vendored",
        openRepo: "Open on GitHub",
        vendoredHint: (p: string) => `Submodule at ${p}`,
        actionsHeading: "What next",
        actionsBody:
            "Pick a repo above and vendor it as a git submodule from Claude Code, then install one of its skills into ~/.claude/skills/:",
        cmdClone: "/discover-skills clone <repo-name>",
        cmdInstall: "/vendor-install <skill-name>",
        refreshHeading: "Refresh the ranking",
        refreshBody:
            "Star counts move. Re-run discover any time to overwrite the manifest with a fresh top 10:",
        cmdSearch: "/discover-skills",
    },

    usecasePage: {
        title: "Getting started with Skills Lector",
        subtitle:
            "What Claude Skills and slash commands are, where they live, and how to use Skills Lector to manage them.",
        tocTitle: "On this page",
        toc: {
            concepts: "Concepts",
            locations: "Where they live",
            catalogTour: "Reading Skills Lector",
            examples: "Worked examples",
            faq: "FAQ",
        },
        concepts: {
            heading: "Concepts",
            body: `**Claude Skills** and **slash commands** are two ways to teach Claude Code a reusable workflow. Both are plain text files on your disk, and both are what Skills Lector scans for.

A **Claude Skill** is a directory containing a \`SKILL.md\` file. The frontmatter declares the skill's \`name\` and \`description\`; the body explains *when* to use it and *how*. Claude reads the description and decides on its own whether the user's request matches — this is called **model invocation**. A skill can also be marked \`disable-model-invocation: true\` to make it slash-only.

A **slash command** is a single \`.md\` file under a \`commands/\` directory. You invoke it explicitly by typing \`/<name>\` in Claude Code. Its frontmatter can declare a \`description\`, an \`argument-hint\`, and \`allowed-tools\`; its body becomes the prompt for that turn — \`$ARGUMENTS\` is replaced with whatever the user typed after the slash.

**The key difference is who triggers it.** Claude picks skills based on context; you pick commands by typing them. Both can ship with permissions and tooling, and both can live in personal, plugin, project, or local scope.`,
        },
        locations: {
            heading: "Where they live",
            body: `Skills Lector scans four scopes for each kind of artifact. The scope is what the **Type** badge on every row tells you.

| Scope | Skills path | Commands path | Notes |
|---|---|---|---|
| **personal** | \`~/.claude/skills/<name>/SKILL.md\` | \`~/.claude/commands/<name>.md\` | Available in every Claude Code session |
| **plugin** | \`~/.claude/plugins/.../skills/...\` | \`~/.claude/plugins/.../commands/...\` | Bundled with an installed plugin |
| **project** | \`<repo>/.claude/skills/<name>/SKILL.md\` | \`<repo>/.claude/commands/<name>.md\` | Scoped to a project; usually committed |
| **local** | bundled \`sample-skills/\` in this app | — | Examples shipped so the dashboard is never empty |

You can point the scanner at extra directories with a \`skills-lector.config.json\` next to where you run the dev server, or with the \`SKILLS_SCAN_ROOTS\` environment variable. See the **Sources** view for the full list of locations being walked right now.`,
        },
        catalogTour: {
            heading: "Reading Skills Lector",
            body: `Skills Lector exposes five views, all built from the same scan. None of them call out to the network — everything is read from your disk.

- **Skills** (\`/\`) — every \`SKILL.md\` discovered, with search, filters, and a detail page that renders the body markdown and shows where the file came from.
- **Commands** (\`/commands\`) — every slash command discovered, with the same search/filter/sort behaviour. The detail page shows the full invocation, frontmatter, and body.
- **Analytics** (\`/analytic\`) — which skills and commands you actually reach for, reconstructed from your Claude Code session transcripts. Useful for spotting things you forgot you installed.
- **Graph** (\`/graph\`) — how skills, commands, and the plugins or projects that bundle them connect. Hubs are the bundling units; edges show references between artifacts.
- **Sources** (\`/sources\`) — the upstream of each skill: which GitHub repository, plugin, or local directory it came from, and a table of every scan root on this machine.

The **Rescan** button in the top-right runs both scans again and refreshes every view.`,
        },
        examples: {
            heading: "Worked examples",
            intro:
                "Four concrete tasks you can do today, ranging from no-code (install) to a minimal authored skill or command.",
            installVendor: {
                heading: "1. Install a vendored skill",
                body: `This repository keeps third-party skills as **git submodules under \`vendor/\`**. The \`/vendor-install\` slash command (which lives in this repo's \`.claude/commands/\`) installs one of them into your personal skills directory, where Claude Code will pick it up.

Run it without arguments to list what is available:`,
                listInvocation: "/vendor-install",
                installInvocation: "/vendor-install debug-mantra",
                after: `Pick a skill name from the listing and pass it as the argument. By default the skill is copied into \`~/.claude/skills/\` (personal scope, available everywhere); pass \`project\` as the second argument to install it into the current repo's \`.claude/skills/\` instead.

Once installed, press **Rescan** in the Skills Lector header — the new skill appears in the Skills view.`,
            },
            authorSkill: {
                heading: "2. Author your own skill",
                body: `A minimal skill is a directory with one file. Create \`~/.claude/skills/<name>/SKILL.md\` and paste:`,
                sampleLabel: "SKILL.md",
                sample: `---
name: greet-user
description: Greet the user warmly by name when they say hello, hi, or otherwise open a conversation. Use this at the start of a new session or when the user explicitly asks to be greeted.
---

# Greet User

When the user opens a conversation with a greeting (hello, hi, hey, สวัสดี, …), respond with a warm one-line greeting that uses their name if you know it, and then ask what they would like to work on.

Do **not** trigger this skill mid-conversation — only on the opening turn or when the user explicitly asks for a greeting.`,
                after: `The \`description\` field is the one Claude reads to decide *when* to trigger the skill — be specific about the trigger phrases. The body is what Claude follows once it has decided to use it. Press **Rescan** and the new skill shows up under **Personal** scope.`,
            },
            authorCommand: {
                heading: "3. Author a slash command",
                body: `A slash command is a single file. Create \`~/.claude/commands/<name>.md\` for a personal command, or \`<repo>/.claude/commands/<name>.md\` for a project-scoped one:`,
                sampleLabel: "explain.md",
                sample: `---
description: Explain a function, file, or concept in this codebase in plain language.
argument-hint: "[function-name|file-path|concept]"
allowed-tools: Read, Grep, Glob
---

Explain **$ARGUMENTS** in plain language. Cover:

1. What it does, in one sentence.
2. Where it is used in this codebase (use Grep / Glob).
3. Any non-obvious behaviour or edge cases worth knowing.

Keep the explanation tight — three short paragraphs at most.`,
                after: `The filename becomes the command name: \`explain.md\` → \`/explain\`. Subdirectories become a \`:\` namespace, so \`docs/api.md\` is \`/docs:api\`. \`$ARGUMENTS\` is replaced with whatever follows the slash invocation. Use \`allowed-tools\` to declare which Claude Code tools the command is permitted to invoke.`,
            },
            discover: {
                heading: "4. Find popular skills to install",
                body: `If you do not yet know which skills are worth installing, the upcoming \`/discover\` page and the \`/discover-skills\` Claude Code command will rank the most popular Claude-Skills repositories on GitHub and let you clone them straight into \`vendor/\`.

That feature ships in **v0.3.0** — until it lands, browse the \`vendor/\` directory of this repository for the curated set of skills that come pre-vendored, and use the **install a vendored skill** flow above.`,
            },
        },
        faq: {
            heading: "FAQ",
            items: [
                {
                    q: "I added a skill but Skills Lector does not show it. Why?",
                    a: "The scan is cached for 8 seconds, and the page is rendered once per request. Press **Rescan** in the top-right; it force-refreshes both the skill and command scans. If it still does not appear, check that the file is at one of the scopes listed under **Where they live** above, and that the directory name matches the skill name in its frontmatter.",
                },
                {
                    q: "What is the difference between a skill and a slash command?",
                    a: "**Who triggers it.** A slash command is invoked by *you* typing \`/<name>\`. A skill is invoked by *Claude* when the user's request matches the skill's \`description\`. Both can carry tooling and prompts; the trigger is what differs.",
                },
                {
                    q: "Does Skills Lector send anything to the network?",
                    a: "No. Skills Lector reads files from your disk and renders them in the browser. It makes no outbound HTTP calls — the **Sources** view links to GitHub but only via plain anchor tags that you click yourself. The discover feature in **v0.3.0** will make a GitHub call, but only from the Claude Code skill, never from Skills Lector itself.",
                },
                {
                    q: "What if my SKILL.md has malformed frontmatter?",
                    a: "The scanner is deliberately lenient. It tries to recover \`name\` and \`description\` even from malformed YAML, and any path that cannot be read at all is reported in the **errors** drawer at the bottom of the page rather than crashing the scan.",
                },
                {
                    q: "How do I stop Claude from auto-invoking a skill?",
                    a: "Add \`disable-model-invocation: true\` to the skill's frontmatter, or use the \`/set-model-invocation\` slash command if you have it installed. The skill then runs only when you explicitly invoke it via a slash command that calls it.",
                },
            ],
        },
    },

    explorer: {
        searchSkills: "Search skills, plugins, sources…",
        searchCommands: "Search commands, plugins, sources…",
        searchHooks: "Search events, matchers, commands…",
        tabAll: "All",
        sortRecent: "Recently updated",
        sortName: "Name (A–Z)",
        sortEvent: "Event (A–Z)",
        sortUsage: "Most used",
        colSkill: "Skill",
        colCommand: "Command",
        colHookCommand: "Command",
        colEvent: "Event",
        colMatcher: "Matcher",
        colType: "Type",
        colScope: "Scope",
        colSource: "Source",
        colSourceFile: "Source file",
        colUpdated: "Last updated",
        colUsed: "Used",
        colInvocation: "Invocation",
        noSkillsMatch: "No skills match your filters.",
        noCommandsMatch: "No commands match your filters.",
        noHooksMatch: "No hooks match your filters.",
        showingSkills: (start: number, end: number, total: number) =>
            `Showing ${start}–${end} of ${total} skills`,
        showingCommands: (start: number, end: number, total: number) =>
            `Showing ${start}–${end} of ${total} commands`,
        showingHooks: (start: number, end: number, total: number) =>
            `Showing ${start}–${end} of ${total} hooks`,
        emptySkills: (total: number) => `0 of ${total} skills`,
        emptyCommands: (total: number) => `0 of ${total} commands`,
        emptyHooks: (total: number) => `0 of ${total} hooks`,
        pluginTitle: (name: string) => `Plugin: ${name}`,
        filterInvocation: "Filter by invocation",
        invocationAll: "All invocation",
        invocationModel: "Model-invocable",
        invocationSlashOnly: "Slash-only",
        invocationModelHint:
            "Model-invocable — Claude can invoke this automatically, no slash command needed",
        invocationSlashOnlyHint: "Slash-only — Claude will not auto-invoke it",
        filterEvent: "Filter by event",
        allEvents: "All events",
        filterPreset: "Filter by preset",
        presetAll: "All presets",
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
        totalCommands: "Total Commands",
        totalHooks: "Total Hooks",
        preToolUseCount: "PreToolUse",
        postToolUseCount: "PostToolUse",
        sessionEventsCount: "Session events",
        preToolUseSub: "before tools run",
        postToolUseSub: "after tools run",
        sessionEventsSub: "start, stop, prompt, …",
        modelInvocableSub: "Claude can auto-invoke",
        slashOnlySub: "slash command only",
        acrossLocations: (count: number) =>
            `across ${count} scanned location${count === 1 ? "" : "s"}`,
        acrossSettingsFiles: (count: number) =>
            `across ${count} settings file${count === 1 ? "" : "s"}`,
        pluginsInstalled: (count: number) =>
            `${count} plugin${count === 1 ? "" : "s"} installed`,
        pluginsShort: (count: number) =>
            `${count} plugin${count === 1 ? "" : "s"}`,
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
                case "personalSettings":
                    return "Personal settings";
                case "projectSettings":
                    return `Project settings: ${arg ?? ""}`;
                case "projectLocalSettings":
                    return `Project local settings: ${arg ?? ""}`;
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
        modelInvocationHint:
            "Run the /model-invocation command in Claude Code to change it:",
        modelInvocationEnable: "Enable — let Claude invoke it automatically",
        modelInvocationDisable: "Disable — make it slash-only",
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
        event: "Event",
        matcher: "Matcher",
        matcherAny: "any",
        command: "Command",
        commandType: "Type",
        timeout: "Timeout",
        timeoutSeconds: (s: number) => `${s} s`,
        sourceFile: "Settings file",
        sourceFileSize: "File size",
        backToPreset: (name: string) => `Back to preset "${name}" in explorer`,
    },

    viewer: {
        preview: "Preview",
        raw: "Raw",
        copy: "Copy",
        copied: "Copied",
        copyRaw: (file: string) => `Copy raw ${file} to clipboard`,
    },

    pluginScopeNotice: {
        headerWithCount: (count: number) =>
            `${count} plugin-scope item${count === 1 ? "" : "s"} hidden — they can't be added to presets.`,
        headerGeneric: "Plugin-scope items can't be added to presets.",
        body: "Preset apply writes to ~/.claude/skills/ only. Plugin frontmatter would be overwritten by the next plugin update.",
        showSteps: "Show install steps",
        stepsIntro: "To make a skill selectable in presets, install it into personal scope:",
        stepVendoredLabel: "Vendored skill (in this repo's vendor/):",
        stepPluginLabel: "Plugin skill from a marketplace:",
        stepPluginBody:
            "Copy skills/<name>/ (or commands/<name>.md) from ~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/ to the matching path under ~/.claude/ , then click Rescan.",
        dismiss: "Dismiss",
        emptyPickerWithHidden: (count: number) =>
            `No personal-scope items yet — ${count} plugin item${count === 1 ? " is" : "s are"} hidden above.`,
    },
};

export type Dictionary = typeof en;
