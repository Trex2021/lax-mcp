import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { request } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { startLaxHttpServer } from '../dist/http.js';
import { fixtureRegistry, sampleSubmission, value } from './helpers.mjs';

const closeServer = server => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });

test('A6: real SDK stdio client initializes, lists, reads and closes the packaged CLI', async t => {
  const registry = await fixtureRegistry(); t.after(registry.close);
  const transport = new StdioClientTransport({
    command: process.execPath, args: ['dist/cli.js', '--base-url', registry.url], cwd: process.cwd(),
    env: {}, stderr: 'pipe',
  });
  const client = new Client({ name: 'stdio-acceptance', version: '1.0.0' });
  t.after(() => client.close());
  await client.connect(transport);
  assert.equal((await client.listTools()).tools.length, 5);
  const result = await client.callTool({ name: 'lax_list_jobs', arguments: { limit: 3 } });
  assert.equal(value(result).jobs[0].id, 'fixture-job');
  assert.equal(registry.requests[0].url, '/registry/jobs?limit=3');
});

test('A5: every stdout line is MCP JSON and private submission inputs are absent from logs', async t => {
  const registry = await fixtureRegistry(); t.after(registry.close);
  const child = spawn(process.execPath, ['dist/cli.js', '--base-url', registry.url], { cwd: process.cwd(), env: {}, stdio: ['pipe', 'pipe', 'pipe'] });
  let stderr = ''; let stdout = ''; let partial = '';
  const pending = new Map();
  const messages = [];
  child.stderr.on('data', chunk => { stderr += chunk; });
  child.stdout.on('data', chunk => {
    stdout += chunk; partial += chunk;
    while (partial.includes('\n')) {
      const i = partial.indexOf('\n'); const line = partial.slice(0, i); partial = partial.slice(i + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line); messages.push(msg);
        pending.get(msg.id)?.resolve(msg); pending.delete(msg.id);
      } catch (error) { for (const waiter of pending.values()) waiter.reject(error); }
    }
  });
  t.after(async () => {
    if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; }
  });
  const request = (id, method, params) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('No protocol response')), 5000);
    pending.set(id, { resolve: msg => { clearTimeout(timer); resolve(msg); }, reject });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
  const initialized = await request(1, 'initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'raw-test', version: '1' } });
  assert.ok(initialized.result.serverInfo);
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const listed = await request(2, 'tools/list', {}); assert.equal(listed.result.tools.length, 5);
  const submitted = await request(3, 'tools/call', { name: 'lax_submit', arguments: sampleSubmission });
  assert.equal(JSON.parse(submitted.result.content[0].text).id, 'local-submission');
  for (const secret of [sampleSubmission.contact, sampleSubmission.payout_address, sampleSubmission.notes]) {
    assert.ok(!stdout.includes(secret)); assert.ok(!stderr.includes(secret));
  }
  for (const line of stdout.trim().split('\n')) assert.equal(JSON.parse(line).jsonrpc, '2.0');
  assert.equal(messages.length, 3);
  assert.equal(registry.requests.length, 1);
});

test('A6: real SDK Streamable HTTP client can use all five tools', async t => {
  const registry = await fixtureRegistry(); t.after(registry.close);
  const server = await startLaxHttpServer({ port: 0, baseUrl: registry.url }); t.after(() => closeServer(server));
  const client = new Client({ name: 'http-acceptance', version: '1.0.0' }); t.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${server.address().port}/mcp`)));
  assert.equal((await client.listTools()).tools.length, 5);
  for (const [name, args] of [
    ['lax_search_agents', { query: 'safe tools' }], ['lax_get_offer', { id: 'fixture-offer' }],
    ['lax_list_jobs', { limit: 1 }], ['lax_get_job', { id: 'fixture-job' }], ['lax_submit', sampleSubmission],
  ]) assert.ok(!(await client.callTool({ name, arguments: args })).isError, name);
  assert.equal(registry.requests.length, 5);
});

test('A6: HTTP enforces origin, host, media type, method and body size limits', async t => {
  const server = await startLaxHttpServer({ port: 0, fetch: async () => { throw new Error('No upstream request expected'); } });
  t.after(() => closeServer(server));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base + '/health')).status, 200);
  assert.equal((await fetch(base + '/health', { headers: { Origin: 'https://attacker.invalid' } })).status, 403);
  // Fetch implementations may rewrite Host. Send the hostile authority on the wire.
  const hostileHostStatus = await new Promise((resolve, reject) => {
    const req = request(base + '/health', { headers: { Host: 'attacker.invalid' } }, res => {
      res.resume(); resolve(res.statusCode);
    });
    req.on('error', reject); req.end();
  });
  assert.equal(hostileHostStatus, 403);
  assert.equal((await fetch(base + '/mcp')).status, 405);
  assert.equal((await fetch(base + '/mcp', { method: 'DELETE' })).status, 405);
  assert.equal((await fetch(base + '/missing')).status, 404);
  assert.equal((await fetch(base + '/mcp', { method: 'POST', body: 'hello', headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal((await fetch(base + '/mcp', { method: 'POST', body: '{broken', headers: { 'content-type': 'application/json' } })).status, 400);
  assert.equal((await fetch(base + '/mcp', { method: 'POST', body: JSON.stringify({ oversized: 'x'.repeat(66000) }), headers: { 'content-type': 'application/json' } })).status, 413);
});

test('A6: HTTP bearer authentication protects both protocol and health endpoints', async t => {
  const server = await startLaxHttpServer({ port: 0, token: 'synthetic-test-token', fetch: async () => new Response('{"jobs":[]}') });
  t.after(() => closeServer(server));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base + '/health')).status, 401);
  assert.equal((await fetch(base + '/health', { headers: { authorization: 'Bearer wrong' } })).status, 401);
  assert.equal((await fetch(base + '/health', { headers: { authorization: 'Bearer synthetic-test-token' } })).status, 200);
  const client = new Client({ name: 'authenticated-http-test', version: '1' }); t.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(new URL(base + '/mcp'), { requestInit: { headers: { Authorization: 'Bearer synthetic-test-token' } } }));
  assert.equal((await client.listTools()).tools.length, 5);
  assert.deepEqual(value(await client.callTool({ name: 'lax_list_jobs', arguments: {} })), { jobs: [] });
});

test('A6: CLI help and invalid flags never produce non-protocol stdout', () => {
  for (const [args, status] of [[['--help'], 0], [['--version'], 0], [['--unknown'], 1], [['--port', '3000'], 1], [['--http', '--port', '-2'], 1], [['--base-url'], 1]]) {
    const run = spawnSync(process.execPath, ['dist/cli.js', ...args], { env: {}, encoding: 'utf8', timeout: 5000 });
    assert.equal(run.status, status, JSON.stringify(args)); assert.equal(run.stdout, ''); assert.ok(run.stderr.length > 0);
  }
});

test('A6: CLI accepts PORT and reports its actual loopback HTTP endpoint on stderr', async t => {
  const child = spawn(process.execPath, ['dist/cli.js', '--http', '--read-only'], { env: { PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = ''; child.stdout.on('data', c => { stdout += c; });
  t.after(async () => { if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; } });
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('No ready message')), 5000);
    child.stderr.on('data', chunk => {
      const match = String(chunk).match(/http:\/\/127\.0\.0\.1:(\d+)\/mcp/);
      if (match) { clearTimeout(timer); resolve(`http://127.0.0.1:${match[1]}/health`); }
    });
  });
  assert.equal((await fetch(endpoint)).status, 200); assert.equal(stdout, '');
});
