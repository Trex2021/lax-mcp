import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--coverage')) throw new Error('Only --coverage is supported.');
const files = (await readdir(join(root, 'test'))).filter(name => name.endsWith('.test.mjs')).sort().map(name => join(root, 'test', name));
if (!files.length) throw new Error('No acceptance tests found.');
const result = spawnSync(process.execPath, [...(args.includes('--coverage') ? ['--experimental-test-coverage'] : []),
  '--test', '--test-reporter=spec', '--test-concurrency=1', ...files], { cwd: root, stdio: 'inherit' });
if (result.error) process.stderr.write('The acceptance runner could not start.\n');
process.exitCode = result.status ?? 1;
