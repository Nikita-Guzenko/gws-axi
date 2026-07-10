import { SERVICES, TUNED_SERVICES } from './config.js';

export const VERSION = '0.1.0';

export function topLevelHelp(): string {
  return `gws-axi ${VERSION} — agent-ergonomic wrapper around the gws Google Workspace CLI

USAGE
  gws-axi <service> <resource> [sub-resource] <method> [--id <id>] [--params <JSON>] [flags]

AXI CONVENTIONS
  • Compact output   Lists render as  header[N]{fields}:  + one indented line per item.
                     Single objects render as a few  key: value  lines. No raw JSON dumps.
  • help[N]: trailer Every command prints 1-3 "what you can do next" hints.
  • Sane defaults    gmail defaults userId=me; calendar defaults calendarId=primary;
                     list methods get a reasonable pageSize/maxResults.
  • --id mapping     --id <v> maps onto the right param per service
                     (fileId / messageId / spreadsheetId / documentId / eventId / …).
  • Escape hatches   --raw (or --json-out) prints the underlying gws JSON verbatim.
                     --format table|yaml|csv passes straight through to gws.
                     Unrecognized flags/params are forwarded to gws untouched.

TUNED SERVICES (curated columns + defaults)
  ${TUNED_SERVICES.join(', ')}

ALL SERVICES (generic compact render)
  ${SERVICES.join(', ')}

EXAMPLES
  gws-axi drive files list
  gws-axi drive files get --id 1AbC...
  gws-axi gmail users messages list --params '{"q":"is:unread"}'
  gws-axi sheets spreadsheets values get --id 1XyZ... --params '{"range":"A1:D10"}'
  gws-axi calendar events list
  gws-axi drive files list --raw            # underlying gws JSON, unchanged
  gws-axi drive files list --format table   # gws native table output

Wraps and requires the upstream gws CLI: https://github.com/googleworkspace/cli
Not an official Google product.
Run  gws-axi <service> --help  for the native gws help of any service.`;
}
