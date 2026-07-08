import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chmodSync } from 'node:fs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const fakeGws = path.join(here, 'fixtures', 'fake-gws.mjs');
const cli = path.join(here, '..', 'src', 'cli.ts');
chmodSync(fakeGws, 0o755);

// Run the CLI through tsx so we exercise the real entry point end-to-end.
function run(args: string[], env: Record<string, string> = {}) {
  const res = spawnSync(process.execPath, ['--import', 'tsx', cli, ...args], {
    encoding: 'utf8',
    env: { ...process.env, GWS_AXI_BIN: fakeGws, ...env },
  });
  return { stdout: res.stdout, stderr: res.stderr, code: res.status };
}

test('compact render + help trailer for a list', () => {
  const { stdout, code } = run(['drive', 'files', 'list']);
  assert.equal(code, 0);
  assert.match(stdout, /^files\[2\]\{id,name,mimeType,modifiedTime,size\}:/m);
  assert.match(stdout, /nextPageToken: TOK123/);
  assert.match(stdout, /^help\[\d\]:/m);
});

test('--raw prints underlying gws JSON unchanged', () => {
  const { stdout } = run(['drive', 'files', 'list', '--raw']);
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.kind, 'drive#fileList');
  assert.equal(parsed.files.length, 2);
  assert.ok(!stdout.includes('help['));
});

test('auth error: exit code 2 and stderr surfaced, not swallowed', () => {
  const { stderr, code } = run(['drive', 'files', 'list'], { FAKE_MODE: 'auth' });
  assert.equal(code, 2);
  assert.match(stderr, /error\[auth\]/);
});

test('missing gws binary → clear message, no stack trace, exit 1', () => {
  const { stderr, code } = run(['drive', 'files', 'list'], { GWS_AXI_BIN: '/no/such/gws-binary' });
  assert.equal(code, 1);
  assert.match(stderr, /upstream 'gws' CLI was not found/);
  assert.ok(!stderr.includes('at '), 'should not contain a stack trace');
});

test('--format table passes through verbatim', () => {
  const { stdout } = run(['drive', 'files', 'list', '--format', 'table'], { FAKE_MODE: 'table' });
  assert.match(stdout, /TABLE_OUTPUT format=table/);
});

test('non-JSON stdout falls back to verbatim instead of crashing', () => {
  const { stdout, code } = run(['drive', 'files', 'list'], { FAKE_MODE: 'notjson' });
  assert.equal(code, 0);
  assert.match(stdout, /not-json-output/);
});

test('top-level --help lists services and conventions', () => {
  const { stdout, code } = run(['--help']);
  assert.equal(code, 0);
  assert.match(stdout, /AXI CONVENTIONS/);
  assert.match(stdout, /drive, sheets, gmail, calendar/);
});

// Sanity: the built binary is a valid executable entry too.
test('built dist bin runs top-level help', () => {
  execSync('npm run build', { cwd: path.join(here, '..'), stdio: 'ignore' });
  const dist = path.join(here, '..', 'dist', 'cli.js');
  const res = spawnSync(process.execPath, [dist, '--help'], { encoding: 'utf8' });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /gws-axi 0\.1\.0/);
});
