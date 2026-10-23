import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

// These controlled mutations affect compiled local files only. Restore every file,
// including on failure. Never run this script concurrently with build or tests.
const mutants = [
  { name: 'A2 wrong jobs route', file: 'dist/index.js',
    from: "registry.request('jobs', args", to: "registry.request('wrong-jobs', args" },
  { name: 'A2 submission leaks job_id into body', file: 'dist/index.js',
    from: 'undefined, body, signal)', to: 'undefined, args, signal)' },
  { name: 'A3 error flag removed', file: 'dist/index.js',
    from: 'isError: true', to: 'isError: false' },
  { name: 'A4 invalid payout accepted', file: 'dist/schemas.js',
    from: ".regex(/^0x[0-9a-fA-F]{40}$/, 'Use a 0x-prefixed 20-byte EVM address.')", to: '' },
  { name: 'A4 read-only guard removed', file: 'dist/index.js',
    from: 'if (!registry.allowSubmit)', to: 'if (false)' },
  { name: 'A2 nested JSON output amplification', file: 'dist/index.js',
    from: 'text: answer', to: 'text: JSON.stringify(JSON.parse(answer), null, 2)' },
  { name: 'A6 HTTP admission guard removed', file: 'dist/http.js',
    from: 'if (active >= maxConcurrent)', to: 'if (false)' },
  { name: 'A6 Host allowlist removed', file: 'dist/http.js',
    from: '!hosts.has(authority.hostname)', to: 'false' },
];
const originals = new Map();
for (const { file } of mutants) if (!originals.has(file)) originals.set(file, await readFile(file, 'utf8'));
const run = () => spawnSync(process.execPath, ['--test', '--test-reporter=spec', '--test-concurrency=1', 'test/acceptance.test.mjs', 'test/security.test.mjs'],
  { encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
const baseline = run();
assert.equal(baseline.status, 0, 'Baseline must pass before introducing faults.');
const report = { kind: 'controlled-local-mutation-check', started: new Date().toISOString(),
  node: process.version, baselinePassed: true, note: 'Eight targeted mutants, not an exhaustive mutation score or organizer hidden tests.', mutants: [] };
try {
  for (const mutant of mutants) {
    const source = originals.get(mutant.file);
    assert.ok(source.includes(mutant.from), `Mutation anchor not found: ${mutant.name}`);
    await writeFile(mutant.file, source.replace(mutant.from, mutant.to));
    const result = run();
    await writeFile(mutant.file, source);
    assert.equal(result.signal, null, `Timed-out mutation: ${mutant.name}`);
    assert.ok(result.status !== 0, `Tests missed mutation: ${mutant.name}`);
    const failures = (result.stdout + result.stderr).split('\n').filter(x => /(?:✖|not ok) A[1-7]:/.test(x));
    assert.ok(failures.length, 'Require assertion failures, not just an import or runtime crash.');
    report.mutants.push({ name: mutant.name, detected: true, failedAssertions: failures.map(x => x.replace(/\s*\([^)]*ms\)$/, '').trim()) });
    console.log(`DETECTED: ${mutant.name}`);
  }
} finally { for (const [file, source] of originals) await writeFile(file, source); }
report.restoredBaselinePassed = run().status === 0;
assert.ok(report.restoredBaselinePassed);
report.finished = new Date().toISOString();
await mkdir('evidence', { recursive: true });
await writeFile('evidence/mutations.json', JSON.stringify(report, null, 2) + '\n');
console.log('PASS: eight deliberately introduced regressions detected; original compiled files restored.');
