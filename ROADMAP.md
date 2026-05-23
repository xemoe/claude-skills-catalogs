# Roadmap

This document plans upcoming releases of Skills Lector. It is the source of
truth for _what_ is being built and _why_; implementation details live in
the code and in [CLAUDE.md](CLAUDE.md). Shipped work moves to
[CHANGELOG.md](CHANGELOG.md) once a milestone closes.

**Current state** — milestones v0.1.0 through v0.5.0 have shipped to
`main` (see the [changelog](CHANGELOG.md)). No further milestone is currently
in flight; the items below are candidates for the next planning round.

## Candidate items (unscheduled)

These ideas have been considered but are not yet on a milestone:

- Wiring up ESLint and adding a lint gate to CI.
- Adding an automated test suite (there is none today; `npm run build` is
  the only correctness gate).
- Publishing packages to npm (the packages are intentionally `private`).
- Editing hooks — or any other `settings.json` content — from the web app;
  the `/hooks` catalog, like every page in the catalog, is currently
  read-only.
- Hard-delete escape hatch for presets — the current soft-delete (archive)
  path is intentional, but a permanent purge option may be wanted for
  test/scratch presets.
