---
name: gtag
description: Use when the user wants to tag a release, bump the version, or create a new release for the project. Handles semantic version bumping based on the nature of changes, updates package.json, commits, tags, and pushes.
user-invocable: true
argument-hint: "[patch|minor|major]"
---

Tag a new release by bumping the version in package.json, committing, tagging, and pushing.

## Steps

1. Run `git branch --show-current` to check the current branch. If it is not `main`, stop and tell the user to switch to main before tagging a release.

2. Run `git log $(git describe --tags --abbrev=0)..HEAD --oneline` to see all commits since the last tag. If no tags exist yet, run `git log --oneline` to see all commits.

2. Determine the version bump based on the commits and semantic versioning norms:
   - **patch** (e.g. 1.0.1 -> 1.0.2): bug fixes, small tweaks, typos, dependency updates, config changes, minor visual polish. No new features, no breaking changes.
   - **minor** (e.g. 1.0.1 -> 1.1.0): new user-facing features or meaningful capability additions that are backwards compatible. Could be a single notable feature or a collection of smaller ones that together represent a meaningful release.
   - **major** (e.g. 1.0.1 -> 2.0.0): breaking changes, major architecture overhauls, or a significant shift in what the app does or how it works.

   If the user passed an argument (patch/minor/major), use that instead of inferring.

3. Read the current version from `package.json`.

4. Calculate the new version by incrementing the appropriate part and resetting lower parts to 0 (e.g. minor bump: 1.2.3 -> 1.3.0, patch bump: 1.2.3 -> 1.2.4).

5. Update the `version` field in `package.json` with the new version string.

6. Run `gacp "bump version to v{version}"` to stage, commit, and push the version change.

7. Run `git tag v{version}` then `git push origin v{version}` to create and push the tag.

8. Report back:
   - What version bump was applied and why (one sentence referencing the commits)
   - The new version number
   - Confirm the tag was pushed
