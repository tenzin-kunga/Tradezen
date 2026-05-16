# GitHub Ruleset - Protect Main Branch

Use this ruleset in GitHub repository settings to protect the `main` branch.

## Ruleset Identity

- Name: Protect Main Branch
- Target: Branch
- Enforcement status: Active
- Branch pattern: 

## Protection Rules

1. Restrict direct updates
- Block direct pushes to `main`.
- Allow updates only through pull requests.

2. Restrict deletions and force updates
- Block branch deletion.
- Block force pushes.
- Block non-fast-forward updates.

3. Pull request requirements
- Require a pull request before merging.
- Require at least 1 approving review.
- Dismiss stale approvals when new commits are pushed.
- Require conversation resolution before merge.
- Require approval of the most recent push.

4. Status checks required before merge
- Require status checks to pass before merging.
- Require branch to be up to date before merging.
- Required checks (recommended minimum):
  - api-ci
  - web-ci
  - lint
  - test
  - build

5. History and commit integrity
- Require linear history.
- Require signed commits (recommended).

6. Merge controls
- Disable merge commits.
- Allow squash merge and/or rebase merge only.

7. Bypass policy
- No bypass for developers.
- Optional emergency bypass only for repository admins.

## Develop-Only Promotion Policy

To ensure `main` only receives changes from `develop`:

- Policy: only pull requests with source branch `develop` can target `main`.
- Enforce with a required status check named `main-source-branch-guard`.
- The check must fail if:
  - Base branch is `main`, and
  - Head/source branch is not `develop`.

## Operational Workflow

1. Create task branch from `develop`.
2. Open PR from task branch to `develop`.
3. Merge into `develop` after checks/review.
4. Open promotion PR from `develop` to `main`.
5. Merge into `main` only after all required checks pass.

## Minimum Recommended Branch Strategy

- Protected branches: `main`, `develop`
- Feature branches: `feature/*`
- Bugfix branches: `fix/*`
- Hotfix branches: `hotfix/*`

## Audit and Maintenance

- Review ruleset monthly.
- Add new required checks when CI pipelines change.
- Keep ruleset changes documented in PRs.
