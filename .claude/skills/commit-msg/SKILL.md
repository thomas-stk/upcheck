---
name: commit-msg
description: Stages all changes, commits with a one-line summary, and pushes to origin using the gacp alias. Use when the user asks to commit changes, commit and push, or save their work.
---

When committing changes:

1. Run `git diff HEAD` and `git status` to understand what changed.
2. Write a single concise commit message line that summarizes what changed (not why, just what -- e.g. "add login form validation" or "fix null pointer in user service").
3. Run `gacp "<message>"` to stage all files, commit, and push to origin in one step.
4. Report back the commit message used and confirm it pushed successfully.

Rules:
- The commit message must be one line only -- no body, no bullet points.
- Never use em dashes in the commit message.
- Keep the message under 72 characters.
- Use imperative mood: "add", "fix", "update", "remove" -- not "added", "fixed", etc.
