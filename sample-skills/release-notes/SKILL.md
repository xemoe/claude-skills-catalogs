---
name: release-notes
description: Draft release notes from a list of merged pull requests, grouped by change type with a short highlights summary at the top.
---

# Release Notes Drafter

Turns a raw list of merged PRs into clean, reader-friendly release notes.

## Output format

```
## <version> — <date>

### Highlights
- One or two sentences on the most important changes.

### Features
- ...

### Fixes
- ...

### Internal
- ...
```

## Rules

- Classify each PR by its title prefix (`feat`, `fix`, `chore`, `docs`).
- Write user-facing language — describe the benefit, not the implementation.
- Omit empty sections.
