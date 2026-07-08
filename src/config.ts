// Hand-tuned ergonomic surfaces for the highest-value gws services.
//
// A service/resource/method the code has no entry for still works: the CLI
// falls through to a generic passthrough and the renderer degrades to a
// shape-driven compact view. Everything here is pure sugar on top of that.

export interface ErgoEntry {
  /** Maps the ergonomic `--id <v>` flag onto the correct gws param name. */
  idParam?: string;
  /** Params merged UNDER the user's own --params (user always wins). */
  defaults?: Record<string, unknown>;
  /** Curated columns for list rendering (dot-paths allowed, e.g. "start.dateTime"). */
  columns?: string[];
  /** Explicit array key to render as the list, when a response has several. */
  itemsKey?: string;
  /** Custom "what next" hint lines. */
  help?: string[];
}

// Keyed by the full command path joined with spaces, e.g. "gmail users messages list".
const ENTRIES: Record<string, ErgoEntry> = {
  // ---- drive ----
  'drive files list': {
    idParam: 'fileId',
    defaults: { pageSize: 20 },
    columns: ['id', 'name', 'mimeType', 'modifiedTime', 'size'],
    itemsKey: 'files',
    help: [
      'Run gws-axi drive files get --id <id> to view a file',
      'Filter with --params \'{"q":"name contains \\"report\\""}\'',
    ],
  },
  'drive files get': {
    idParam: 'fileId',
    help: ['Run gws-axi drive files list to browse files'],
  },
  'drive drives list': {
    idParam: 'driveId',
    defaults: { pageSize: 20 },
    columns: ['id', 'name', 'kind'],
    itemsKey: 'drives',
  },

  // ---- gmail ----
  'gmail users messages list': {
    idParam: 'id',
    defaults: { userId: 'me', maxResults: 20 },
    columns: ['id', 'threadId'],
    itemsKey: 'messages',
    help: [
      'Run gws-axi gmail users messages get --id <id> to read a message',
      'Search with --params \'{"q":"is:unread"}\'',
    ],
  },
  'gmail users messages get': {
    idParam: 'id',
    defaults: { userId: 'me' },
    help: ['Add --raw for the full MIME payload'],
  },
  'gmail users threads list': {
    idParam: 'id',
    defaults: { userId: 'me', maxResults: 20 },
    columns: ['id', 'snippet', 'historyId'],
    itemsKey: 'threads',
  },
  'gmail users labels list': {
    idParam: 'id',
    defaults: { userId: 'me' },
    columns: ['id', 'name', 'type', 'messagesTotal'],
    itemsKey: 'labels',
  },
  'gmail users drafts list': {
    idParam: 'id',
    defaults: { userId: 'me', maxResults: 20 },
    columns: ['id', 'message.id'],
    itemsKey: 'drafts',
  },

  // ---- sheets ----
  'sheets spreadsheets get': {
    idParam: 'spreadsheetId',
    help: ['Run gws-axi sheets spreadsheets values get --id <id> --params \'{"range":"A1:D10"}\''],
  },
  'sheets spreadsheets values get': {
    idParam: 'spreadsheetId',
    columns: [],
    itemsKey: 'values',
    help: ['Use --params \'{"range":"Sheet1!A1:Z100"}\' to pick a range'],
  },

  // ---- calendar ----
  'calendar events list': {
    idParam: 'eventId',
    defaults: { calendarId: 'primary', maxResults: 20, singleEvents: true, orderBy: 'startTime' },
    columns: ['id', 'summary', 'start.dateTime', 'end.dateTime', 'status'],
    itemsKey: 'items',
    help: [
      'Run gws-axi calendar events get --id <id> to view an event',
      'Narrow with --params \'{"timeMin":"2026-01-01T00:00:00Z"}\'',
    ],
  },
  'calendar events get': {
    idParam: 'eventId',
    defaults: { calendarId: 'primary' },
  },
  'calendar calendarList list': {
    defaults: { maxResults: 20 },
    columns: ['id', 'summary', 'accessRole', 'primary'],
    itemsKey: 'items',
  },

  // ---- docs ----
  'docs documents get': {
    idParam: 'documentId',
    help: ['Add --raw to see the full document body structure'],
  },
};

// Fallback --id param by service, when no exact entry provides one.
const SERVICE_ID_PARAM: Record<string, string> = {
  drive: 'fileId',
  sheets: 'spreadsheetId',
  docs: 'documentId',
  slides: 'presentationId',
  forms: 'formId',
  tasks: 'taskId',
};

export function lookupErgo(path: string[]): ErgoEntry | undefined {
  return ENTRIES[path.join(' ')];
}

/** Resolve which gws param the ergonomic `--id` flag should populate. */
export function resolveIdParam(path: string[]): string | undefined {
  const entry = lookupErgo(path);
  if (entry?.idParam) return entry.idParam;
  return SERVICE_ID_PARAM[path[0]];
}

export const SERVICES = [
  'drive', 'sheets', 'gmail', 'calendar', 'admin-reports', 'docs', 'slides',
  'tasks', 'people', 'chat', 'classroom', 'forms', 'keep', 'meet', 'events',
  'modelarmor', 'workflow', 'script',
];

export const TUNED_SERVICES = ['drive', 'gmail', 'sheets', 'calendar', 'docs'];
