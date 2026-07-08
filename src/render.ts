// The reshaping layer: turn a raw `gws --format json` payload into the compact,
// token-economical agent view. Pure functions, fully unit-testable — no I/O.

const MAX_VALUE_LEN = 120;
const MAX_ITEMS = 50;
const MAX_INFERRED_COLS = 6;
// Response-envelope keys that are never the "items" array of a list.
const META_KEYS = new Set(['kind', 'etag', 'nextPageToken', 'nextSyncToken', 'incompleteSearch', 'resultSizeEstimate']);

export interface RenderOptions {
  /** Curated columns; [] means "infer". Dot-paths allowed (e.g. "start.dateTime"). */
  columns?: string[];
  /** Force which array key is the list. */
  itemsKey?: string;
  /** Label for single-object renders (e.g. "files", "message"). */
  label?: string;
  /** When true, auto-detect the dominant array as the list even without itemsKey. */
  isList?: boolean;
}

export function renderResult(data: unknown, opts: RenderOptions = {}): string {
  if (Array.isArray(data)) {
    return renderList(data, opts.label ?? 'items', opts.columns);
  }
  if (data !== null && typeof data === 'object') {
    return renderObjectOrList(data as Record<string, unknown>, opts);
  }
  // Scalar top-level response.
  return `result: ${formatScalar(data)}`;
}

function renderObjectOrList(obj: Record<string, unknown>, opts: RenderOptions): string {
  // Explicit itemsKey always wins; otherwise only auto-detect a list array in
  // list contexts, so a `get` response with an incidental array (e.g. a
  // spreadsheet's `sheets`) still renders as a single object.
  const items = opts.itemsKey && Array.isArray(obj[opts.itemsKey])
    ? pickItemsArray(obj, opts.itemsKey)
    : opts.isList
      ? pickItemsArray(obj, undefined)
      : null;
  if (items) {
    const lines = [renderList(items.value, items.key, opts.columns)];
    // Surface pagination/meta so an agent can continue without --raw.
    for (const mk of ['nextPageToken', 'nextSyncToken']) {
      if (typeof obj[mk] === 'string' && obj[mk]) lines.push(`${mk}: ${truncate(obj[mk] as string)}`);
    }
    return lines.join('\n');
  }
  return renderObject(obj, opts.label ?? 'result');
}

interface PickedItems { key: string; value: unknown[]; }

function pickItemsArray(obj: Record<string, unknown>, itemsKey?: string): PickedItems | null {
  if (itemsKey && Array.isArray(obj[itemsKey])) {
    return { key: itemsKey, value: obj[itemsKey] as unknown[] };
  }
  // Otherwise: pick the array-valued property that isn't envelope meta,
  // preferring the largest (the dominant collection).
  const candidates = Object.entries(obj)
    .filter(([k, v]) => Array.isArray(v) && !META_KEYS.has(k)) as [string, unknown[]][];
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b[1].length - a[1].length);
  return { key: candidates[0][0], value: candidates[0][1] };
}

export function renderList(arr: unknown[], name: string, columns?: string[]): string {
  const shown = arr.slice(0, MAX_ITEMS);
  const first = shown.find((x) => x !== null && x !== undefined);

  // Array-of-arrays (e.g. sheets values): render rows directly.
  if (Array.isArray(first)) {
    const header = `${name}[${arr.length}]:`;
    const rows = shown.map((row) => '  ' + (row as unknown[]).map((c) => csvCell(formatScalar(c))).join(','));
    return trailer(header, rows, arr.length, name);
  }

  // Array of objects: columns header + one line each.
  if (first !== null && typeof first === 'object') {
    const cols = columns && columns.length > 0 ? columns : inferColumns(shown as Record<string, unknown>[]);
    const header = `${name}[${arr.length}]{${cols.join(',')}}:`;
    const rows = shown.map(
      (item) => '  ' + cols.map((c) => csvCell(formatScalar(getPath(item, c)))).join(','),
    );
    return trailer(header, rows, arr.length, name);
  }

  // Array of scalars.
  const header = `${name}[${arr.length}]:`;
  const rows = shown.map((v) => '  ' + csvCell(formatScalar(v)));
  return trailer(header, rows, arr.length, name);
}

function trailer(header: string, rows: string[], total: number, name: string): string {
  const out = [header, ...rows];
  if (total === 0) out.push('  (none)');
  if (total > MAX_ITEMS) out.push(`  … +${total - MAX_ITEMS} more (--raw for all)`);
  void name;
  return out.join('\n');
}

function inferColumns(items: Record<string, unknown>[]): string[] {
  const seen: string[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    for (const [k, v] of Object.entries(item)) {
      if (isScalar(v) && !seen.includes(k)) seen.push(k);
      if (seen.length >= MAX_INFERRED_COLS) return seen;
    }
    if (seen.length > 0) break; // first non-empty object is representative
  }
  // No scalar keys at all — fall back to the property names themselves.
  if (seen.length === 0 && items[0]) {
    return Object.keys(items[0]).slice(0, MAX_INFERRED_COLS);
  }
  return seen;
}

export function renderObject(obj: Record<string, unknown>, label: string): string {
  const lines = [`${label}:`];
  for (const [k, v] of Object.entries(obj)) {
    lines.push(`  ${k}: ${formatValue(v)}`);
  }
  return lines.join('\n');
}

// --- value formatting ---

function isScalar(v: unknown): boolean {
  return v === null || ['string', 'number', 'boolean'].includes(typeof v);
}

/** Compact one-line form for a nested value inside an object render. */
function formatValue(v: unknown): string {
  if (Array.isArray(v)) return `[${v.length}]`;
  if (v !== null && typeof v === 'object') {
    const keys = Object.keys(v as object);
    const head = keys.slice(0, 4).join(',');
    return `{${head}${keys.length > 4 ? ',…' : ''}}`;
  }
  return truncate(formatScalar(v));
}

/** Scalar → string, with nested objects/arrays collapsed to a compact marker. */
export function formatScalar(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return `[${v.length}]`;
  if (typeof v === 'object') {
    const keys = Object.keys(v as object);
    return `{${keys.slice(0, 3).join(',')}${keys.length > 3 ? ',…' : ''}}`;
  }
  return truncate(String(v));
}

export function truncate(s: string, max = MAX_VALUE_LEN): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

/** Quote CSV-style cells that contain commas, quotes, or newlines. */
function csvCell(s: string): string {
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/** Resolve a dot-path like "start.dateTime" against a value. */
export function getPath(obj: unknown, path: string): unknown {
  if (!path.includes('.')) return (obj as Record<string, unknown>)?.[path];
  let cur: unknown = obj;
  for (const part of path.split('.')) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}
