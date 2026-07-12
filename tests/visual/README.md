# Visual regression tests

Snapshots the typography-critical primitives (Button, Input, Select, Dialog,
Badge, Table) plus a handful of high-traffic pages in both **light** and
**dark** mode, on desktop and mobile viewports.

## Run

```bash
# Dev server must be running at http://localhost:8080
bun run dev

# First run — record baselines
bunx playwright test --update-snapshots

# Subsequent runs — fail on any diff
bunx playwright test
```

Override the target with `PLAYWRIGHT_BASE_URL=https://…`.

Snapshots live next to the spec at `tests/visual/typography.spec.ts-snapshots/`.
Review any diff in `test-results/` before updating baselines.

## Adding coverage

- **New primitive** → add it to `/dev/typography` (see `src/routes/dev.typography.tsx`)
  and Playwright picks it up automatically.
- **New page** → append its path to `PUBLIC_PAGES` in `typography.spec.ts`.
  Auth-gated pages need a session fixture; not covered by this suite yet.