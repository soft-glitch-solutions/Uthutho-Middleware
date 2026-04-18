Copilot tasks & demo-deploy workflow

Purpose

This document tells the Copilot assistant (and contributors) how to handle tasks that require creating branches and requesting demo deployments. The repository has demo branches that trigger FTP deployments for the following servers: `main`, `shaqeel`, `makhi`, and `waseem`.

When a task/issue is assigned to the assistant

1. Create a focused feature branch for the issue using the naming convention:
   - feature/copilot-<issue-number>-<short-description>
   - example: feature/copilot-36-xlsx-exporter

2. Implement changes in that branch, run local checks:
   - npm ci
   - npm run lint
   - npm run build (or npm run build:dev for dev-mode)
   - npm run test:e2e (if Playwright is installed locally)

3. Push branch to origin and open a PR targeting a demo branch for testing (choose one tester):
   - PR target branches: shaqeel, makhi, waseem (pick the person you want to test)
   - Example PR target: shaqeel
   - In the PR description include:
     - link to the issue
     - short list of files changed
     - exact test steps (how to build, where to click, expected results)
     - any environment variables or secrets required for the demo

4. Assign the PR to the tester (GitHub assignee field) and add a reviewer tag:
   - For Shaqeel: assign to @MogammadShaqeelless16
   - For Makhi: assign to @Makhi7
   - For Waseem: assign to @WDollie27

5. Deployment behavior:
   - Merging a PR into one of the demo branches (shaqeel, makhi, waseem) triggers an FTP deployment of the production build files to that tester's demo server.
   - Merging into `main` deploys to the main demo server.

6. Tester responsibilities:
   - Pull latest changes from the demo branch is optional (the server will be updated by FTP). The tester should:
     - Open the demo site URL (internal team should track hostnames for each tester)
     - Perform the exact test steps provided in the PR description
     - Report results inline in the PR and/or update the linked issue
     - If the test fails, create a comment with steps to reproduce and optionally push a fix branch targeting the same tester branch

7. After testing
   - If approved by the tester, merge the PR into `main` to put the change into the main demo server (or follow release policy your team prefers).
   - If additional fixes are requested, iterate in the feature branch and push updates to the same PR.

Branching & PR conventions for Copilot-made changes

- Branch prefix: feature/copilot- or fix/copilot- depending on the change type.
- Include the issue number in the branch name.
- PR title format: [copilot][#<issue-number>] Short description
- PR body must include:
  - Steps to reproduce (if fixing a bug)
  - How to verify (exact click/inputs/expected output)
  - Commands to build/test locally

Local test checklist to include in PRs

- npm ci
- npm run lint
- npm run build
- npm run preview (optional) to locally validate generated build
- npm run test:e2e (Playwright) — if E2E tests are included for the changed area

Notes for the assistant

- Always include a short testing checklist in PRs and link to the relevant issue.
- Prefer assigning human testers by name as above (Shaqeel/Makhi/Waseem) so someone receives the demo deploy.
- When in doubt about which demo branch to target, use `shaqeel` by default and mention other testers in the PR description.

Where to find this file

- skills/COPILOT_TASKS.md (this file)

Update process

If the demo deploy mechanism, branch names, or tester assignments change, update this file and create a PR describing the new behavior.