import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, buildGwsArgv } from '../src/args.ts';
import { resolveIdParam, lookupErgo } from '../src/config.ts';

test('leading positionals become the command path', () => {
  const p = parseArgs(['gmail', 'users', 'messages', 'list']);
  assert.deepEqual(p.path, ['gmail', 'users', 'messages', 'list']);
});

test('--raw and --json-out set raw', () => {
  assert.equal(parseArgs(['drive', 'files', 'list', '--raw']).raw, true);
  assert.equal(parseArgs(['drive', 'files', 'list', '--json-out']).raw, true);
});

test('--id and --params captured, unknown flags forwarded verbatim', () => {
  const p = parseArgs(['drive', 'files', 'get', '--id', 'ABC', '--params', '{"x":1}', '--page-all', '--page-limit', '5']);
  assert.equal(p.id, 'ABC');
  assert.equal(p.params, '{"x":1}');
  assert.deepEqual(p.passthrough, ['--page-all', '--page-limit', '5']);
});

test('buildGwsArgv injects defaults under user params and adds --format json', () => {
  const p = parseArgs(['gmail', 'users', 'messages', 'list']);
  const entry = lookupErgo(p.path);
  const { argv, format } = buildGwsArgv(p, { defaults: entry?.defaults });
  assert.equal(format, 'json');
  const idx = argv.indexOf('--params');
  const params = JSON.parse(argv[idx + 1]);
  assert.equal(params.userId, 'me');
  assert.equal(params.maxResults, 20);
  assert.ok(argv.includes('--format'));
  assert.equal(argv[argv.indexOf('--format') + 1], 'json');
});

test('user params override ergonomic defaults', () => {
  const p = parseArgs(['gmail', 'users', 'messages', 'list', '--params', '{"maxResults":5}']);
  const entry = lookupErgo(p.path);
  const { argv } = buildGwsArgv(p, { defaults: entry?.defaults });
  const params = JSON.parse(argv[argv.indexOf('--params') + 1]);
  assert.equal(params.maxResults, 5);
  assert.equal(params.userId, 'me');
});

test('--id maps to the resolved param name', () => {
  const p = parseArgs(['drive', 'files', 'get', '--id', 'FILE1']);
  const idParam = resolveIdParam(p.path);
  assert.equal(idParam, 'fileId');
  const { argv } = buildGwsArgv(p, { idParam });
  const params = JSON.parse(argv[argv.indexOf('--params') + 1]);
  assert.equal(params.fileId, 'FILE1');
});

test('sheets --id resolves to spreadsheetId', () => {
  assert.equal(resolveIdParam(['sheets', 'spreadsheets', 'get']), 'spreadsheetId');
});

test('unknown service falls through with no defaults (generic path)', () => {
  const p = parseArgs(['keep', 'notes', 'list']);
  const entry = lookupErgo(p.path);
  assert.equal(entry, undefined);
  const { argv } = buildGwsArgv(p, { defaults: entry?.defaults });
  // no params injected, just the path + format
  assert.deepEqual(argv, ['keep', 'notes', 'list', '--format', 'json']);
});

test('--format passes through and is echoed to gws', () => {
  const p = parseArgs(['drive', 'files', 'list', '--format', 'table']);
  assert.equal(p.format, 'table');
  const { argv, format } = buildGwsArgv(p, {});
  assert.equal(format, 'table');
  assert.equal(argv[argv.indexOf('--format') + 1], 'table');
});

test('malformed --params JSON is forwarded verbatim (not swallowed)', () => {
  const p = parseArgs(['drive', 'files', 'list', '--params', '{bad json']);
  const { argv } = buildGwsArgv(p, { defaults: { pageSize: 20 } });
  assert.equal(argv[argv.indexOf('--params') + 1], '{bad json');
});

test('malformed --params still forwards --id verbatim (never dropped)', () => {
  const p = parseArgs(['drive', 'files', 'get', '--id', 'FILE1', '--params', '{bad json']);
  const idParam = resolveIdParam(p.path);
  const { argv } = buildGwsArgv(p, { idParam });
  assert.equal(argv[argv.indexOf('--params') + 1], '{bad json');
  assert.equal(argv[argv.indexOf('--id') + 1], 'FILE1');
});

test('valid-but-non-object --params (array/scalar) is forwarded verbatim, not swallowed', () => {
  const arr = parseArgs(['drive', 'files', 'list', '--params', '[1,2]']);
  const { argv: a1 } = buildGwsArgv(arr, { defaults: { pageSize: 20 } });
  assert.equal(a1[a1.indexOf('--params') + 1], '[1,2]');

  const scalar = parseArgs(['drive', 'files', 'list', '--params', '42']);
  const { argv: a2 } = buildGwsArgv(scalar, { defaults: { pageSize: 20 } });
  assert.equal(a2[a2.indexOf('--params') + 1], '42');
});
