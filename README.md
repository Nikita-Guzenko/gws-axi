# gws-axi

An **agent-ergonomic wrapper** around the [`gws` Google Workspace CLI](https://github.com/googleworkspace/cli).

`gws-axi` shells out to the real `gws` binary (always requesting `--format json`) and reshapes the
result into a compact, token-economical view designed for AI agents — instead of dumping multi-KB
raw API payloads. It does **not** reimplement any Google API; it is a thin front door over `gws`.

> Requires the upstream `gws` CLI on your `PATH`. Install it from
> <https://github.com/googleworkspace/cli>. **Not an official Google product.**

## Install

```bash
npm install -g gws-axi     # or: npx gws-axi <...>
```

`gws-axi` needs `gws` installed and authenticated (`gws auth login`). If `gws` is not found on
`PATH`, `gws-axi` prints a one-line notice and exits non-zero.

## The axi conventions

Every `-axi` tool shares the same house style:

- **Compact, structured output.** Lists render as a header line followed by one indented line per
  item, showing only the useful columns:

  ```
  files[2]{id,name,mimeType,modifiedTime,size}:
    1a,Report.pdf,application/pdf,2026-06-01T10:00:00Z,20481
    2b,notes,application/vnd.google-apps.document,2026-06-02T11:00:00Z,
  help[3]:
    Run gws-axi drive files get --id <id> to view a file
    Filter with --params '{"q":"name contains \"report\""}'
    Pass --params '{"pageToken":"CFG_TOKEN_abc123"}' for the next page
  ```

  Single objects render as a few `key: value` lines with nested structures collapsed
  (`properties: {title}`, `sheets: [3]`).

- **`help[N]:` trailer** — after every command, 1–3 short "what you can do next" hints.

- **Sane agent defaults** that cut boilerplate:
  - gmail methods default `userId=me`
  - calendar methods default `calendarId=primary`
  - list methods get a reasonable `pageSize` / `maxResults`

- **`--id` mapping.** The ergonomic `--id <value>` flag maps onto the correct underlying param per
  service: `fileId` (drive), `id` (gmail messages), `spreadsheetId` (sheets), `documentId` (docs),
  `eventId` (calendar), …

- **Token economy.** Long values are truncated, lists cap at 50 rows (with a `+N more` marker),
  and nested blobs are collapsed — never a raw multi-KB dump unless you ask.

- **Full power preserved.** `--raw` (or `--json-out`) prints the underlying `gws` JSON verbatim,
  `--format table|yaml|csv` passes straight through to `gws`, and any flag `gws-axi` doesn't
  recognize is forwarded to `gws` untouched, so nothing is lost.

## Usage

```
gws-axi <service> <resource> [sub-resource] <method> [--id <id>] [--params <JSON>] [flags]
```

### Tuned services (curated columns + defaults)

`drive`, `gmail`, `sheets`, `calendar`, `docs`

### All services (generic compact render)

`drive, sheets, gmail, calendar, admin-reports, docs, slides, tasks, people, chat, classroom,
forms, keep, meet, events, modelarmor, workflow, script`

A service/resource the wrapper has no hand-tuning for still works: it degrades gracefully to a
generic compact render driven by the JSON's own shape.

## Examples

### Drive

```bash
gws-axi drive files list
gws-axi drive files list --params '{"q":"mimeType=\"application/pdf\""}'
gws-axi drive files get --id 1AbC...
```

### Gmail

```bash
gws-axi gmail users messages list                    # userId=me injected
gws-axi gmail users messages list --params '{"q":"is:unread"}'
gws-axi gmail users messages get --id 19f4...        # id + userId=me injected
```

### Sheets

```bash
gws-axi sheets spreadsheets get --id 1XyZ...
gws-axi sheets spreadsheets values get --id 1XyZ... --params '{"range":"Sheet1!A1:D10"}'
```

### Calendar / Docs

```bash
gws-axi calendar events list                         # calendarId=primary injected
gws-axi docs documents get --id 1Doc...
```

## The `--raw` escape hatch

```bash
gws-axi drive files list --raw            # underlying gws JSON, byte-for-byte
gws-axi drive files list --format table   # gws native table output
gws-axi drive files list --page-all       # forwarded straight to gws
```

## Errors & exit codes

`gws-axi` surfaces `gws`'s own exit codes and stderr without swallowing them:

| code | meaning                                   |
|------|-------------------------------------------|
| 0    | success                                   |
| 1    | API error (or missing `gws` binary)       |
| 2    | auth error — credentials missing/invalid  |
| 3    | validation — bad arguments/input          |
| 4    | discovery — could not fetch API schema    |
| 5    | internal — unexpected failure             |

## Development

```bash
npm install
npm run build     # tsc → dist/
npm test          # node --test (mocks gws; no live Google auth needed)
```

The output-reshaping layer (`src/render.ts`) is pure and fully unit-tested against mocked
`gws --format json` samples.

## License

MIT — see [LICENSE](./LICENSE).
