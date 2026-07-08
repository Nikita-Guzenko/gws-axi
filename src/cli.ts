#!/usr/bin/env node
// gws-axi entry point. Parses argv, shells out to `gws --format json`,
// reshapes the result into the compact agent view, prints help trailers.

import { parseArgs, buildGwsArgv } from './args.js';
import { lookupErgo, resolveIdParam } from './config.js';
import { runGws } from './gws.js';
import { renderResult } from './render.js';
import { buildHelpLines, formatHelp } from './help.js';
import { topLevelHelp, VERSION } from './usage.js';

const GWS_MISSING = `gws-axi: the upstream 'gws' CLI was not found on PATH.
Install it from https://github.com/googleworkspace/cli then re-run.
gws-axi is a thin wrapper and requires the gws binary.`;

export function main(rawArgv: string[]): number {
  const parsed = parseArgs(rawArgv);

  // Top-level help / version (no command path given).
  if (parsed.path.length === 0) {
    if (parsed.passthrough.includes('--version') || rawArgv.includes('-V')) {
      process.stdout.write(VERSION + '\n');
      return 0;
    }
    process.stdout.write(topLevelHelp() + '\n');
    return 0;
  }

  const entry = lookupErgo(parsed.path);
  const idParam = resolveIdParam(parsed.path);
  const { argv, format } = buildGwsArgv(parsed, { idParam, defaults: entry?.defaults });

  const binary = process.env.GWS_AXI_BIN || 'gws';
  const result = runGws(argv, binary);

  if (result.notFound) {
    process.stderr.write(GWS_MISSING + '\n');
    return 1;
  }

  // Non-zero exit: surface gws stderr + exit code faithfully, don't swallow.
  if (result.code !== 0) {
    if (result.stdout) process.stdout.write(ensureNewline(result.stdout));
    if (result.stderr) process.stderr.write(ensureNewline(result.stderr));
    return result.code;
  }

  // Native help forwarded to gws, or non-json format: print verbatim.
  if (parsed.help || parsed.raw || format !== 'json') {
    process.stdout.write(ensureNewline(result.stdout));
    return 0;
  }

  // Compact reshape path.
  let data: unknown;
  try {
    data = JSON.parse(result.stdout);
  } catch {
    // Not JSON (unexpected) — fall back to verbatim rather than crash.
    process.stdout.write(ensureNewline(result.stdout));
    return 0;
  }

  const label = deriveLabel(parsed.path);
  const method = parsed.path[parsed.path.length - 1];
  const rendered = renderResult(data, {
    columns: entry?.columns,
    itemsKey: entry?.itemsKey,
    label,
    isList: method === 'list',
  });
  const help = formatHelp(buildHelpLines(parsed.path, data));
  process.stdout.write(rendered + '\n' + help + '\n');
  return 0;
}

function deriveLabel(path: string[]): string {
  // Use the resource segment (2nd token) when present, else the service.
  return path.length >= 2 ? path[path.length - 2] : path[0];
}

function ensureNewline(s: string): string {
  return s.endsWith('\n') || s.length === 0 ? s : s + '\n';
}

// Only run when invoked as the binary, not when imported by tests.
const invokedPath = process.argv[1] ?? '';
if (invokedPath.endsWith('cli.js') || invokedPath.endsWith('cli.ts')) {
  process.exit(main(process.argv.slice(2)));
}
