# API request collections

`.http` files for exercising the API by hand, one per module, using the
same request/response shapes the automated tests use. Each file is
self-contained — it registers its own throwaway user/org at the top,
so you can run any file on its own without running the others first.

## Setup

1. Install the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
   VS Code extension (`humao.rest-client`). JetBrains' built-in HTTP Client
   also understands these files and `http-client.env.json`.
2. Start the API: `pnpm --filter @algowix/server dev` (port 4000).
3. Open any `.http` file, click "Send Request" above the first request
   (or use "Run all requests" from the command palette), then work down
   the file — later requests depend on cookies/variables set by earlier
   ones in the same file.
4. In VS Code, pick the `local` environment once (bottom-right status
   bar, or `Rest Client: Switch Environment`) so `{{baseUrl}}` and
   `{{platformAdminKey}}` resolve. Both come from `.vscode/settings.json`
   and `http-client.env.json` (kept in sync — the former is what
   `humao.rest-client` reads, the latter is what JetBrains reads).

## Files

- **`auth.http`** — register, session (`/me`, `/sessions`), email
  verification, refresh, login (success + wrong-password), logout.
- **`tenant.http`** — the tenant lifecycle from a member's point of
  view: PENDING right after register, PATCH settings, member list,
  verify-email into TRIALING, self-cancel, and confirming the
  now-cancelled org gets locked out with 403s.
- **`tenant-admin.http`** — the platform-admin routes
  (`x-platform-key` header, not a user session): wrong-key rejection,
  suspend, reactivate, and the purge-before-retention-elapsed 409 guard.

## The `/auth/test/verification-token` endpoint

There's no email provider wired up yet (06-Authentication.md defers
it), so verification links are only logged to server stdout in dev.
`GET /api/v1/auth/test/verification-token?email=...` is a **dev/test-only**
route (registered only when `NODE_ENV !== "production"`, see
`auth.router.ts`) that returns the current token for an email instead —
used here and by the `apps/e2e` Playwright suite so nothing has to
scrape logs. Never rely on this route existing outside local/CI.

## Adding a new module's requests

Copy the shape of `tenant.http`: register your own test user at the
top (`@email = yourmodule.{{$guid}}@example.com`) so the file doesn't
collide with any other file's data, then walk the module's endpoints
top to bottom, calling out the interesting edge cases (permission
denials, invalid state transitions, cross-tenant isolation) as you go
— not just the happy path.
