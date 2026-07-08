import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderResult, renderList, getPath, formatScalar, truncate } from '../src/render.ts';

test('drive files list → header[N]{fields}: + per-item lines', () => {
  const data = {
    kind: 'drive#fileList',
    incompleteSearch: false,
    files: [
      { id: '1a', name: 'Report.pdf', mimeType: 'application/pdf', modifiedTime: 't1', size: '20' },
      { id: '2b', name: 'notes', mimeType: 'application/vnd.google-apps.document', modifiedTime: 't2' },
    ],
    nextPageToken: 'TOK',
  };
  const out = renderResult(data, {
    columns: ['id', 'name', 'mimeType', 'modifiedTime', 'size'],
    itemsKey: 'files',
  });
  const lines = out.split('\n');
  assert.equal(lines[0], 'files[2]{id,name,mimeType,modifiedTime,size}:');
  assert.equal(lines[1], '  1a,Report.pdf,application/pdf,t1,20');
  // missing field renders as empty trailing cell
  assert.equal(lines[2], '  2b,notes,application/vnd.google-apps.document,t2,');
  // pagination token surfaced
  assert.ok(out.includes('nextPageToken: TOK'));
});

test('meta keys (kind/etag) are never chosen as the items array', () => {
  const data = { kind: 'x', etag: 'e', files: [{ id: '1' }] };
  const out = renderResult(data, { isList: true });
  assert.ok(out.startsWith('files[1]'));
});

test('largest array wins when itemsKey not given', () => {
  const data = { small: [{ a: 1 }], big: [{ a: 1 }, { a: 2 }, { a: 3 }] };
  const out = renderResult(data, { isList: true });
  assert.ok(out.startsWith('big[3]'));
});

test('columns inferred from first object when none curated', () => {
  const arr = [{ id: 'x', name: 'y', nested: { deep: 1 }, tags: [1, 2] }];
  const out = renderList(arr, 'things');
  // only scalar keys become columns
  assert.equal(out.split('\n')[0], 'things[1]{id,name}:');
});

test('array-of-arrays (sheets values) renders rows', () => {
  const data = { range: 'A1:B2', majorDimension: 'ROWS', values: [['a', 'b'], ['c', 'd']] };
  const out = renderResult(data, { itemsKey: 'values', columns: [] });
  const lines = out.split('\n');
  assert.equal(lines[0], 'values[2]:');
  assert.equal(lines[1], '  a,b');
  assert.equal(lines[2], '  c,d');
});

test('CSV cells with commas are quoted', () => {
  const arr = [{ name: 'a, b, c' }];
  const out = renderList(arr, 'x', ['name']);
  assert.ok(out.includes('"a, b, c"'));
});

test('empty list shows (none)', () => {
  const out = renderResult({ files: [] }, { itemsKey: 'files' });
  assert.ok(out.includes('files[0]'));
  assert.ok(out.includes('(none)'));
});

test('single object renders key: value with nested collapsed', () => {
  const data = { spreadsheetId: 'abc', properties: { title: 'Budget' }, sheets: [{}, {}] };
  const out = renderResult(data, { label: 'spreadsheet' });
  const lines = out.split('\n');
  assert.equal(lines[0], 'spreadsheet:');
  assert.ok(out.includes('spreadsheetId: abc'));
  assert.ok(out.includes('properties: {title}'));
  assert.ok(out.includes('sheets: [2]'));
});

test('dot-path columns resolve nested values', () => {
  const arr = [{ id: '1', start: { dateTime: '2026-01-01T10:00:00Z' } }];
  const out = renderList(arr, 'items', ['id', 'start.dateTime']);
  assert.ok(out.includes('1,2026-01-01T10:00:00Z'));
});

test('getPath handles missing intermediate', () => {
  assert.equal(getPath({ a: {} }, 'a.b.c'), undefined);
  assert.equal(getPath({ a: { b: 5 } }, 'a.b'), 5);
});

test('long values are truncated', () => {
  const long = 'x'.repeat(200);
  assert.equal(truncate(long).length, 120);
  assert.ok(truncate(long).endsWith('…'));
});

test('formatScalar collapses objects and arrays', () => {
  assert.equal(formatScalar({ a: 1, b: 2, c: 3, d: 4 }), '{a,b,c,…}');
  assert.equal(formatScalar([1, 2, 3]), '[3]');
  assert.equal(formatScalar(null), '');
});

test('degrades gracefully for unknown shape (array of scalars)', () => {
  const out = renderResult(['a', 'b'], { label: 'vals' });
  assert.equal(out.split('\n')[0], 'vals[2]:');
});

test('truncation caps items at 50 with more-marker', () => {
  const arr = Array.from({ length: 60 }, (_, i) => ({ id: String(i) }));
  const out = renderList(arr, 'x', ['id']);
  assert.ok(out.includes('x[60]'));
  assert.ok(out.includes('+10 more'));
});
