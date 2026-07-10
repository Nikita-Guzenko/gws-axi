# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Add durable project-specific notes here as they are discovered through real work.

## What this is

`gws-axi` is a thin, agent-ergonomic wrapper over the upstream `gws` Google Workspace CLI
(https://github.com/googleworkspace/cli). It `spawnSync`s the real `gws` binary with
`--format json` and reshapes the output into a compact view. It never reimplements Google APIs.

## Architecture (src/)

- `cli.ts` — entry point: parse → run gws → reshape → print `help[N]:` trailer. Only runs `main`
  when invoked as the binary (guarded by `process.argv[1]` ending in `cli.js|cli.ts`), so tests
  can import it. `GWS_AXI_BIN` env var overrides the `gws` binary path (used by tests).
- `args.ts` — argv → `{path, raw, id, params, format, passthrough}`. Leading non-flag tokens are
  the command path; unrecognized flags/values are forwarded to `gws` verbatim (full-power passthrough).
- `config.ts` — hand-tuned ergonomic surfaces (defaults, `--id`→param mapping, curated columns)
  keyed by the joined command path. Untuned paths fall through to the generic render.
- `render.ts` — **pure** reshaping layer, the primary unit-test target. List vs single-object is
  gated by `isList` (method === 'list') OR an explicit `itemsKey`, so a `get` response with an
  incidental array (e.g. a spreadsheet's `sheets`) still renders as one object.
- `help.ts` / `usage.ts` — trailer hints and top-level help.

## Build / test

- `npm run build` → `tsc` → `dist/`. ESM + NodeNext; source imports use `.js` extensions.
- `npm test` → `node --import tsx --test test/*.test.ts`. Requires devDep `@types/node`.
- Tests mock `gws` via `test/fixtures/fake-gws.mjs` (driven by `FAKE_MODE`); **no live Google auth
  needed**. Keep it that way for CI.

## gws facts (v0.22.5) worth remembering

- Path params live inside `--params` JSON, not as flags: gmail `userId`, calendar `calendarId`,
  drive `fileId`, sheets `spreadsheetId`, docs `documentId`, calendar events `eventId`.
- gws exit codes: 0 ok, 1 API, 2 auth, 3 validation, 4 discovery, 5 internal — surfaced unchanged.
- `gws <svc> ... --dry-run` prints the request without sending; handy for verifying param injection.
