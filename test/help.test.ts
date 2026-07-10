import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHelpLines, formatHelp } from '../src/help.ts';

test('curated help lines come from config', () => {
  const lines = buildHelpLines(['drive', 'files', 'list'], { files: [] });
  assert.ok(lines[0].includes('gws-axi drive files get --id'));
});

test('pagination hint added when token present', () => {
  const lines = buildHelpLines(['drive', 'files', 'list'], { files: [], nextPageToken: 'ABCDEFGHIJKLMNOPQRST' });
  assert.ok(lines.some((l) => l.includes('pageToken')));
});

test('generic fallback for untuned command', () => {
  const lines = buildHelpLines(['keep', 'notes', 'get'], { id: '1' });
  assert.equal(lines.length, 1);
  assert.ok(lines[0].includes('--raw'));
});

test('at most 3 help lines', () => {
  const lines = buildHelpLines(['drive', 'files', 'list'], { files: [], nextPageToken: 'TOK' });
  assert.ok(lines.length <= 3);
});

test('formatHelp renders help[N]: block', () => {
  const out = formatHelp(['do a thing', 'do another']);
  assert.equal(out.split('\n')[0], 'help[2]:');
  assert.ok(out.includes('  do a thing'));
});
