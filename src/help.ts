// "help[N]:" trailer generation — 1-3 short "what you can do next" hints
// printed after every command, in the axi house style.

import { lookupErgo } from './config.js';

export function buildHelpLines(path: string[], data: unknown): string[] {
  const entry = lookupErgo(path);
  const lines: string[] = [];

  // Custom hints from the ergonomic config take priority.
  if (entry?.help) lines.push(...entry.help);

  const method = path[path.length - 1];
  const isList = method === 'list' || Array.isArray(data);

  // Pagination hint when the payload carries a continuation token.
  if (isRecord(data)) {
    const token = data['nextPageToken'] ?? data['nextSyncToken'];
    if (typeof token === 'string' && token) {
      const key = data['nextPageToken'] ? 'pageToken' : 'syncToken';
      lines.push(`Pass --params '{"${key}":"${short(token)}"}' for the next page`);
    }
  }

  // Generic fallbacks so every command yields at least one hint.
  if (lines.length === 0) {
    if (isList) {
      lines.push('Add --raw to see the full JSON for each item');
    } else {
      lines.push('Add --raw to see the full underlying gws JSON');
    }
  }

  return lines.slice(0, 3);
}

export function formatHelp(lines: string[]): string {
  const out = [`help[${lines.length}]:`];
  for (const l of lines) out.push(`  ${l}`);
  return out.join('\n');
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function short(s: string): string {
  return s.length > 16 ? s.slice(0, 15) + '…' : s;
}
