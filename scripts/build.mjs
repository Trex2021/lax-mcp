import { rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
// Generated output must not retain stale files that npm could publish.
await rm(join(root, 'dist'), { recursive: true, force: true });
const result = spawnSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'], { cwd: root, stdio: 'inherit' });
if (result.error) process.stderr.write('TypeScript build could not start. Run npm ci first.\n');
process.exitCode = result.status ?? 1;
