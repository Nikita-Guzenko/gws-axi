#!/usr/bin/env node
// A stand-in for the real `gws` binary, driven by FAKE_MODE, so the CLI
// integration tests never touch live Google auth.
const mode = process.env.FAKE_MODE || 'list';

if (mode === 'auth') {
  process.stderr.write('error[auth]: credentials missing or invalid\n');
  process.exit(2);
}
if (mode === 'notjson') {
  process.stdout.write('not-json-output\n');
  process.exit(0);
}
if (mode === 'table') {
  // Echoes whatever format was requested so the test can assert passthrough.
  const fmt = process.argv[process.argv.indexOf('--format') + 1];
  process.stdout.write(`TABLE_OUTPUT format=${fmt}\n`);
  process.exit(0);
}

// default: a drive.files.list style payload
process.stdout.write(
  JSON.stringify({
    kind: 'drive#fileList',
    files: [
      { id: '1a', name: 'Report.pdf', mimeType: 'application/pdf', modifiedTime: 't1', size: '20' },
      { id: '2b', name: 'notes', mimeType: 'application/vnd.google-apps.document', modifiedTime: 't2' },
    ],
    nextPageToken: 'TOK123',
  }),
);
process.exit(0);
