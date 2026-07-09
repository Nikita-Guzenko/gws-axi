// Thin wrapper over the real `gws` binary. Shells out; never reimplements APIs.

import { spawnSync } from 'node:child_process';

export interface GwsResult {
  stdout: string;
  stderr: string;
  /** Exit code from gws (0 success; 1 API, 2 auth, 3 validation, 4 discovery, 5 internal). */
  code: number;
  /** True when the gws binary itself could not be found/launched. */
  notFound: boolean;
}

export function runGws(argv: string[], binary = 'gws'): GwsResult {
  const res = spawnSync(binary, argv, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  if (res.error) {
    const notFound = (res.error as NodeJS.ErrnoException).code === 'ENOENT';
    return { stdout: '', stderr: res.error.message, code: notFound ? 127 : 1, notFound };
  }

  return {
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
    code: res.status ?? (res.signal ? 1 : 0),
    notFound: false,
  };
}
