// Parse gws-axi argv into a command path + recognized axi flags + verbatim
// passthrough for everything else (so no gws capability is ever lost).

export interface ParsedArgs {
  /** Leading positional tokens: <service> <resource> [sub] <method>. */
  path: string[];
  /** Print underlying gws JSON verbatim instead of the compact view. */
  raw: boolean;
  /** Show help (axi help at top level, forwarded to gws when a path exists). */
  help: boolean;
  /** Ergonomic --id value, mapped onto the right param downstream. */
  id?: string;
  /** User-supplied --params JSON string (merged with ergonomic defaults). */
  params?: string;
  /** --format value; only "json" (or unset) triggers compact reshaping. */
  format?: string;
  /** Every unrecognized token, in order, forwarded to gws untouched. */
  passthrough: string[];
}

export function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { path: [], raw: false, help: false, passthrough: [] };

  let i = 0;
  // Leading positionals form the command path (up to the first flag).
  while (i < argv.length && !argv[i].startsWith('-')) {
    out.path.push(argv[i]);
    i++;
  }

  for (; i < argv.length; i++) {
    const tok = argv[i];
    switch (tok) {
      case '--raw':
      case '--json-out':
        out.raw = true;
        break;
      case '-h':
      case '--help':
        out.help = true;
        // Also forward so gws can print native help for a specific command.
        out.passthrough.push('--help');
        break;
      case '--id':
        out.id = argv[++i];
        break;
      case '--params':
        out.params = argv[++i];
        break;
      case '--format':
        out.format = argv[++i];
        // forwarded explicitly later
        break;
      default:
        // Unknown flag/value: forward verbatim (preserves full gws surface).
        out.passthrough.push(tok);
    }
  }

  return out;
}

/**
 * Build the final argv handed to the real `gws` binary.
 * Merges ergonomic defaults + --id UNDER/OVER the user's own --params.
 */
export function buildGwsArgv(
  parsed: ParsedArgs,
  opts: { idParam?: string; defaults?: Record<string, unknown> },
): { argv: string[]; format: string } {
  const format = parsed.format ?? 'json';
  const argv = [...parsed.path];

  const userParams = safeParseObject(parsed.params);
  if (userParams === null) {
    // Malformed JSON: forward verbatim so gws emits its own validation error
    // rather than silently swallowing the user's input.
    argv.push('--params', parsed.params as string);
  } else {
    const merged: Record<string, unknown> = { ...(opts.defaults ?? {}), ...userParams };
    if (parsed.id !== undefined && opts.idParam) {
      merged[opts.idParam] = parsed.id;
    }
    if (Object.keys(merged).length > 0) {
      argv.push('--params', JSON.stringify(merged));
    }
    // No idParam resolved for this path: forward --id verbatim so gws can
    // accept or reject it rather than silently dropping the user's target.
    if (parsed.id !== undefined && !opts.idParam) {
      argv.push('--id', parsed.id);
    }
  }

  argv.push('--format', format);
  argv.push(...parsed.passthrough);

  return { argv, format };
}

/** Returns the parsed object, {} if none given, or null if the JSON is malformed. */
function safeParseObject(s?: string): Record<string, unknown> | null {
  if (!s) return {};
  try {
    const v = JSON.parse(s);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return null;
  }
}
