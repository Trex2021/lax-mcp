import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const started = new Date().toISOString();
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 120000, maxBuffer: 2 * 1024 * 1024 });
  assert.equal(result.status, 0, `${command} ${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}
const root = process.cwd();
const packed = JSON.parse(run(npm, ['pack', '--ignore-scripts', '--json'], root))[0];
const temp = await mkdtemp(join(tmpdir(), 'lax-package-'));
try {
  await writeFile(join(temp, 'package.json'), JSON.stringify({ name: 'lax-clean-install-check', private: true, type: 'module' }));
  run(npm, ['install', '--ignore-scripts', '--no-audit', '--no-fund', resolve(packed.filename)], temp);
  await writeFile(join(temp, 'check.mjs'), `
    import assert from 'node:assert/strict';
    import { createLaxMcpServer } from '@trex2021/lax-mcp';
    import { createLaxHttpApp } from '@trex2021/lax-mcp/http';
    import { Client } from '@modelcontextprotocol/sdk/client/index.js';
    import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
    const server = createLaxMcpServer({fetch: async () => new Response('{"jobs":[],"count":0}')});
    const client = new Client({name:'clean-tarball-client',version:'1'});
    const [a,b] = InMemoryTransport.createLinkedPair();
    try {
      await server.connect(a); await client.connect(b);
      assert.equal((await client.listTools()).tools.length, 5);
      const result = await client.callTool({name:'lax_list_jobs',arguments:{}});
      assert.deepEqual(JSON.parse(result.content[0].text),{jobs:[],count:0});
      assert.equal(typeof createLaxHttpApp(), 'function');
    } finally { await client.close(); await server.close(); }
  `);
  run(process.execPath, ['check.mjs'], temp);
  const help = run(process.execPath, ['node_modules/@trex2021/lax-mcp/dist/cli.js', '--help'], temp);
  assert.equal(help, '');
  if (process.platform !== 'win32') {
    assert.equal(run(join(temp, 'node_modules/.bin/lax-mcp'), ['--version'], temp), '');
  }
  const files = packed.files.map(x => x.path);
  assert.ok(files.includes('dist/cli.js') && files.includes('dist/index.d.ts'));
  assert.ok(files.every(x => !/^(src|test|evidence|submission|node_modules)\//.test(x)));
  const installed = JSON.parse(await readFile(join(temp, 'node_modules/@trex2021/lax-mcp/package.json'), 'utf8'));
  assert.equal(installed.bin['lax-mcp'], 'dist/cli.js');
  const report = { kind: 'clean-tarball-install', started, finished: new Date().toISOString(), node: process.version,
    publishedToNpm: false, package: packed.name, version: packed.version, filename: packed.filename,
    integrity: packed.integrity, shasum: packed.shasum, size: packed.size, unpackedSize: packed.unpackedSize,
    files, freshDirectoryInstall: true, factoryImport: true, httpSubpathImport: true, actualMcpClient: true,
    bin: true, passed: true };
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/package.json', JSON.stringify(report, null, 2) + '\n');
  console.log(`PASS: clean tarball installation, exports, SDK client and bin. ${packed.filename}`);
} finally { await rm(temp, { recursive: true, force: true }); }
