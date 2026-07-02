# UpCheck Project Rules

## Pull Requests

PR titles must follow conventional commits format, with the branch number as the scope:

```
{type}(UC-{branch number}): {short description of changes}
```

`{type}` is one of:
- `feat` - new user-facing features or meaningful capability additions
- `fix` - bug fixes
- `chore` - tooling, CI, config, dependency updates, non-user-facing cleanup
- `docs` - documentation only

Examples:
- `feat(UC-2): app icons, tray notifications, and security hardening`
- `chore(UC-3): add unit tests for poller and IPC validation`

Release Please reads these titles to auto-generate the changelog and version bump on merge to main, so the type prefix must be accurate.
