---
description: A minimal example slash command that demonstrates the command file format. Use it as a template when creating a brand new command from scratch.
argument-hint: "[name]"
---

# Hello World

This is a sample slash command bundled with **Skills Lector**. It exists
so the Commands catalog has something to display out of the box and so you can
see how a command `.md` file is structured.

## Your task

Greet the user. If a name was provided in **$ARGUMENTS**, greet that person by
name; otherwise greet them as "world". Keep it to a single friendly sentence.

## Anatomy of a command

A slash command is a single Markdown file under a `commands/` directory:

- **Frontmatter** — the optional YAML block at the top. `description` shows in
  the `/` menu and lets Claude decide when the command is relevant;
  `argument-hint` previews the arguments it expects.
- **Body** — the prompt Claude runs when the command is invoked. `$ARGUMENTS`
  is replaced with whatever the user typed after the command name.
- **Namespacing** — a file at `commands/demo/hello.md` is invoked as
  `/demo:hello`; subdirectories become a `:` namespace.

## When to use this

Copy this file, rename it, and rewrite the frontmatter and body to bootstrap a
new command.
