# AlgoWix E2E suite

Playwright tests that drive the real `apps/web` UI against the real
`apps/server` API and database — the same way a user or the `.http`
request collections (`apps/server/requests/`) do, just automated and
assertion-based instead of click-through/manual.

One spec file per phase doc, named to match
(`auth.spec.ts` ↔ 06-Authentication.md, `tenant.spec.ts` ↔
07-Tenant-Management.md, and so on as more phases land).

## Setup (one-time)

```bash
pnpm install
pnpm --filter @algowix/e2e install-browsers   # downloads a Chromium build
```

Needs a local dev database already migrated + seeded (see the repo
root README / `apps/server/.env.local`) — same requirement as running
the app normally.

## Running

```bash
pnpm --filter @algowix/e2e test          # headless, once
pnpm --filter @algowix/e2e test:headed   # watch it click through in a real window
pnpm --filter @algowix/e2e test:ui       # Playwright's interactive test runner
pnpm --filter @algowix/e2e report        # open the HTML report from the last run
```

`playwright.config.ts` starts both dev servers itself if they're not
already running (`webServer`, ports 3000/4000). If you already have
`pnpm dev` running at the repo root, the suite reuses it instead of
double-starting — faster for local iteration. In CI, servers always
start fresh.

## Conventions

- **Every test creates its own user/org** with a unique email
  (`uniqueEmail()` in `tests/helpers.ts`) — tests don't share or
  depend on each other's data, and don't clean up after themselves
  (throwaway local/CI database; wipe and reseed if it gets cluttered).
- **Drive the real UI, not the API**, for anything a user would
  actually click through (`registerViaUi`) — the point of E2E is
  catching what a pure API test can't (a broken form, wrong redirect,
  a client-side gate that doesn't check what it thinks it checks; see
  the git history around `tenant.spec.ts` for a real example of
  exactly that class of bug this suite caught before it shipped).
- **Use the API directly only for what a user can't do through the
  UI** — e.g. `getVerificationToken`/`verifyEmail` in `helpers.ts`,
  because there's no "resend email" button yet and no real inbox to
  read from (`GET /auth/test/verification-token` is a dev/test-only
  route for exactly this — see its guard in `auth.router.ts`).
- **`fullyParallel: false`** — this points at one shared local SQL
  Server instance, not an isolated per-test database. Parallel runs
  would be a false economy: flaky failures, not faster feedback.
