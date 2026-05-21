---
name: hello-world
description: A minimal example skill that demonstrates the SKILL.md format. Use it as a template when creating a brand new skill from scratch.
---

# Hello World

This is a sample skill bundled with **Claude Skills Catalog**. It exists so the
dashboard has something to display out of the box and so you can see how a
`SKILL.md` file is structured.

## Anatomy of a skill

A skill is just a directory that contains a `SKILL.md` file:

- **Frontmatter** — the YAML block at the top with `name` and `description`.
  The `description` is what Claude reads to decide when the skill is relevant.
- **Body** — Markdown instructions telling Claude how to perform the task.
- **Supporting files** — optional scripts, templates, or reference docs that
  live alongside `SKILL.md`.

## When to use this

Copy this folder, rename it, and rewrite the frontmatter and body to bootstrap
a new skill.
