# Git Workflow Enforcement Guide (TZ-090)

> **Status:** Ready for manual setup
> **Date:** 2026-05-16
> **Repository:** https://github.com/tampered-sin/Tradezen

## Branch Protection Rules

Configure these in GitHub → Settings → Branches → Add rule:

### `main` Branch
- [x] Require pull request reviews before merging (1 approval)
- [x] Require status checks to pass before merging
  - Required checks: `Security Audit`, `Lint & Type Check`, `Unit Tests`, `E2E Tests`
- [x] Require branches to be up to date before merging
- [x] Require conversation resolution before merging
- [x] Include administrators
- [x] Do not allow deletions
- [x] Do not allow force pushes
- [x] Restrict who can push to matching branches

### `develop` Branch
- [x] Require pull request reviews before merging (1 approval)
- [x] Require status checks to pass before merging
  - Required checks: `Security Audit`, `Lint & Type Check`, `Unit Tests`
- [x] Require branches to be up to date before merging
- [x] Include administrators

## Branch Naming Convention

Enforce via pre-receive hook or CI check:

| Pattern | Purpose | Example |
|---------|---------|---------|
| `feature/TZ-XXX-description` | New features | `feature/TZ-070-mobile-responsive` |
| `fix/TZ-XXX-description` | Bug fixes | `fix/TZ-001-validation-error` |
| `chore/description` | Maintenance | `chore/update-dependencies` |
| `docs/description` | Documentation | `docs/add-api-reference` |
| `release/vX.Y.Z` | Releases | `release/v1.0.0` |

## Commit Message Convention

Use Conventional Commits:

```
type(scope): description

[optional body]

[optional footer]
```

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting (no code change) |
| `refactor` | Code refactoring |
| `test` | Test changes |
| `chore` | Maintenance |

Examples:
- `feat(api): add rate limiting with @nestjs/throttler (TZ-010)`
- `fix(web): resolve mobile layout overflow on dashboard (TZ-070)`
- `docs: update API reference with new tRPC procedures (TZ-023)`

## PR Workflow

1. Create feature branch from `develop`
2. Implement changes with conventional commits
3. Run local checks: `bun run lint && bun run check-types && bun run test`
4. Push branch and create PR to `develop`
5. Fill out PR template (`.github/PULL_REQUEST_TEMPLATE.md`)
6. Wait for CI checks to pass
7. Request review from team member
8. Address review comments
9. Squash and merge (or rebase merge)
10. Delete feature branch

## Enforcement Mechanisms

### Automated (CI/CD)
- [x] Security audit (Trivy + `bun pm audit`)
- [x] Lint checks (ESLint)
- [x] Type checks (TypeScript)
- [x] Unit tests (Jest)
- [x] E2E tests (with PostgreSQL + Redis)
- [x] Docker build verification

### Manual (GitHub Settings)
- [ ] Branch protection rules (configure in Settings)
- [ ] Required reviewers (set to 1 minimum)
- [ ] Dismiss stale approvals on new commits
- [ ] Require signed commits (optional)

### Local (Git Hooks)
Consider adding to `.husky/`:
- `pre-commit`: Run lint-staged
- `commit-msg`: Validate conventional commit format
- `pre-push`: Run type check

## Next Steps

1. Configure branch protection rules in GitHub Settings
2. Add required reviewers to repository
3. (Optional) Set up Husky for local git hooks
4. Document workflow in `docs/Rules.md` §18
