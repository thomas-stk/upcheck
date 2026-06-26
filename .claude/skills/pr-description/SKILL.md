---
name: pr-description
description: Writes pull request descriptions and create the pull request. Use when creating a PR, writing a PR, or when the user asks to summarize changes for a pull request.
---

When writing a PR description:

1. Run `git diff main...HEAD` to see all changes on this branch
2. Write a description following this format:

## What
One sentence explaining what this PR does.

## Why
Brief context on why this change is needed

## Changes
- Bullet points of specific changes made
- Group related changes together
- Mention any files deleted or renamed

## Testing 
- Describe any tests that were run or tests that need to be run to test the changes (in check lists)

3. Create the pull request using `gh pr create` with the title format `UC-{branch number}: {short description}` and the description above as the body.

**Note:** `gh` is installed at `C:\Program Files\GitHub CLI\gh.exe` but is not on the Bash PATH. Always invoke it via PowerShell as `& "C:\Program Files\GitHub CLI\gh.exe" pr create ...`.
