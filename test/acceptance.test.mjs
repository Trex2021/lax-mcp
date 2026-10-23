import test from 'node:test';
import assert from 'node:assert/strict';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createLaxMcpServer, TOOL_NAMES } from '../dist/index.js';
import { RegistryClient } from '../dist/registry.js';
import { session, json, text, value, sampleSubmission } from './helpers.mjs';
import { readFile } from 'node:fs/promises';

test('A1: factory returns an unconnected SDK server and performs no I/O', async () => {
  let requests = 0;
  const server = createLaxMcpServer({ fetch: async () => { requests++; return json({}); } });
  assert.ok(server instanceof McpServer);
  assert.equal(requests, 0);
  await server.close();
});

test('A1: real SDK client discovers exactly five described tools and schemas', async t => {
  const s = await session({ fetch: async () => json({}) }); t.after(s.close);
  const { tools } = await s.client.listTools();
  assert.deepEqual(tools.map(x => x.name).sort(), [...TOOL_NAMES].sort());
  for (const tool of tools) {
    assert.ok(tool.description.length > 30);
    assert.equal(tool.inputSchema.type, 'object');
    assert.equal(tool.annotations.readOnlyHint, tool.name !== 'lax_submit');
    assert.equal(tool.annotations.idempotentHint, tool.name !== 'lax_submit');
  }
  assert.equal(tools.find(x => x.name === 'lax_search_agents').inputSchema.properties.query.maxLength, 100);
  assert.equal(tools.find(x => x.name === 'lax_submit').inputSchema.additionalProperties, false);
});

for (const row of [
  ['lax_search_agents', { query: 'MCP + safe & reliable?' }, '/registry/search?query=MCP+%2B+safe+%26+reliable%3F', 'GET'],
  ['lax_search_agents', {}, '/registry/search', 'GET'],
  ['lax_get_offer', { id: 'offer-1' }, '/registry/offers/offer-1', 'GET'],
  ['lax_list_jobs', { track: 'godman-protocols', limit: 7, offset: 0 }, '/registry/jobs?track=godman-protocols&limit=7&offset=0', 'GET'],
  ['lax_get_job', { id: 'test-job' }, '/registry/jobs/test-job', 'GET'],
  ['lax_submit', sampleSubmission, '/registry/jobs/test-job/submissions', 'POST'],
]) {
  test(`A2: ${row[0]} maps arguments to the documented registry call (${row[3]})`, async t => {
    const calls = [];
    const answer = { ok: true, source: 'injected-registry', nested: { n: 42 }, data: ['a', 'b'] };
    const s = await session({ baseUrl: 'https://registry.example/registry/', fetch: async (url, init) => {
      calls.push({ url, init }); return json(answer, init.method === 'POST' ? 201 : 200);
    } }); t.after(s.close);
    const result = await s.client.callTool({ name: row[0], arguments: row[1] });
    assert.ok(!result.isError);
    assert.deepEqual(value(result), answer);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://registry.example' + row[2]);
    assert.equal(calls[0].init.method, row[3]);
    assert.equal(calls[0].init.redirect, 'manual');
    if (row[3] === 'POST') {
      const { job_id, ...expected } = sampleSubmission;
      assert.deepEqual(JSON.parse(calls[0].init.body), expected);
      assert.ok(!('job_id' in JSON.parse(calls[0].init.body)));
    } else assert.equal(calls[0].init.body, undefined);
  });
}

test('A2: default registry and global fetch are used, with no wallet or payment headers', async t => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, init }); return json({ count: 0 }); };
  t.after(() => { globalThis.fetch = original; });
  const s = await session(); t.after(s.close);
  await s.client.callTool({ name: 'lax_list_jobs', arguments: {} });
  assert.equal(calls[0].url, 'https://lax.kognai.ai/registry/jobs');
  assert.deepEqual(calls[0].init.headers, { accept: 'application/json' });
});

for (const status of [400, 401, 403, 404, 409, 429, 500, 503]) {
  test(`A3: HTTP ${status} preserves the registry reason, then a subsequent call succeeds`, async t => {
    let n = 0;
    const s = await session({ fetch: async () => ++n === 1 ? json({ error: `fixture-${status}` }, status) : json({ recovered: true }) });
    t.after(s.close);
    const bad = await s.client.callTool({ name: 'lax_get_job', arguments: { id: 'one' } });
    assert.equal(bad.isError, true);
    assert.match(text(bad), new RegExp(`HTTP ${status}: fixture-${status}`));
    const good = await s.client.callTool({ name: 'lax_get_job', arguments: { id: 'two' } });
    assert.deepEqual(value(good), { recovered: true });
    assert.equal(n, 2, 'There is no hidden retry or duplicate submission.');
  });
}

test('A3: nested registry error messages are retained', async t => {
  const s = await session({ fetch: async () => json({ error: { message: 'Offer not found' } }, 404) }); t.after(s.close);
  assert.match(text(await s.client.callTool({ name: 'lax_get_offer', arguments: { id: 'x' } })), /HTTP 404: Offer not found/);
});

for (const [label, body, expected] of [
  ['plain text', 'Offer not found', /HTTP 404: Offer not found/],
  ['JSON string', '"Offer not found"', /HTTP 404: Offer not found/],
  ['HTML proxy page', '<html>private proxy diagnostic</html>', /HTTP 404: Registry rejected the request/],
]) {
  test(`A3: ${label} errors preserve useful reasons and exclude proxy pages`, async t => {
    const s = await session({ fetch: async () => new Response(body, { status: 404 }) }); t.after(s.close);
    const result = await s.client.callTool({ name: 'lax_get_offer', arguments: { id: 'x' } });
    assert.equal(result.isError, true); assert.match(text(result), expected);
    assert.ok(!text(result).includes('private proxy diagnostic'));
  });
}

test('A3: invalid UTF-8 retains HTTP status and permits a subsequent valid response', async t => {
  let n = 0;
  const s = await session({ fetch: async () => ++n === 1
    ? new Response(new Uint8Array([0xc3, 0x28]), { status: 200 }) : json({ ok: true }) }); t.after(s.close);
  const result = await s.client.callTool({ name: 'lax_list_jobs', arguments: {} });
  assert.equal(result.isError, true); assert.match(text(result), /HTTP 200:.*invalid UTF-8/);
  assert.equal(value(await s.client.callTool({ name: 'lax_list_jobs', arguments: {} })).ok, true);
});

test('A3: network failure is bounded, does not leak the exception, and permits recovery', async t => {
  let n = 0;
  const s = await session({ fetch: async () => { if (++n === 1) throw new Error('Authorization: private-token'); return json({ ok: true }); } });
  t.after(s.close);
  const bad = await s.client.callTool({ name: 'lax_list_jobs', arguments: {} });
  assert.equal(bad.isError, true); assert.match(text(bad), /connectivity/); assert.ok(!text(bad).includes('private-token'));
  assert.equal(value(await s.client.callTool({ name: 'lax_list_jobs', arguments: {} })).ok, true);
});

test('A3: an upstream that ignores abort still times out without hanging the next call', async t => {
  let n = 0;
  const s = await session({ timeoutMs: 15, fetch: async () => ++n === 1 ? new Promise(() => {}) : json({ ok: true }) }); t.after(s.close);
  const started = Date.now();
  const result = await s.client.callTool({ name: 'lax_list_jobs', arguments: {} });
  assert.equal(result.isError, true); assert.match(text(result), /timed out/); assert.ok(Date.now() - started < 1000);
  assert.equal(value(await s.client.callTool({ name: 'lax_list_jobs', arguments: {} })).ok, true);
});

test('A3: invalid JSON and oversized responses are errors with a usable next call', async t => {
  let n = 0;
  const s = await session({ maxResponseBytes: 64, fetch: async () => {
    n++;
    if (n === 1) return new Response('not json', { status: 200 });
    if (n === 2) return new Response('x'.repeat(65), { status: 200 });
    return json({ ok: true });
  } }); t.after(s.close);
  assert.match(text(await s.client.callTool({ name: 'lax_list_jobs', arguments: {} })), /invalid JSON/);
  assert.match(text(await s.client.callTool({ name: 'lax_list_jobs', arguments: {} })), /size limit/);
  assert.equal(value(await s.client.callTool({ name: 'lax_list_jobs', arguments: {} })).ok, true);
});

const invalid = [
  ['missing offer id', 'lax_get_offer', {}],
  ['empty id', 'lax_get_job', { id: '' }],
  ['path traversal', 'lax_get_job', { id: '../offers' }],
  ['dot path', 'lax_get_job', { id: '..' }],
  ['long query', 'lax_search_agents', { query: 'a'.repeat(101) }],
  ['fractional limit', 'lax_list_jobs', { limit: 1.5 }],
  ['large limit', 'lax_list_jobs', { limit: 101 }],
  ['negative offset', 'lax_list_jobs', { offset: -1 }],
  ['unknown track', 'lax_list_jobs', { track: 'invented' }],
  ['unexpected field', 'lax_list_jobs', { authorization: 'do not forward' }],
  ['bad payout', 'lax_submit', { ...sampleSubmission, payout_address: '0x1234' }],
  ['non-hex payout', 'lax_submit', { ...sampleSubmission, payout_address: '0x' + 'z'.repeat(40) }],
  ['http link', 'lax_submit', { ...sampleSubmission, repo_or_patch_url: 'http://example.invalid/x' }],
  ['URL credentials', 'lax_submit', { ...sampleSubmission, repo_or_patch_url: 'https://name:secret@example.invalid/x' }],
  ['missing DID', 'lax_submit', { ...sampleSubmission, agent_did: undefined }],
  ['invalid DID', 'lax_submit', { ...sampleSubmission, agent_did: 'https://example.invalid' }],
  ['empty contact', 'lax_submit', { ...sampleSubmission, contact: ' ' }],
  ['multiline contact', 'lax_submit', { ...sampleSubmission, contact: 'a\nAuthorization: secret' }],
  ['long notes', 'lax_submit', { ...sampleSubmission, notes: 'x'.repeat(2001) }],
];
for (const [label, name, args] of invalid) {
  test(`A4: ${label} is refused before any registry request`, async t => {
    let calls = 0;
    const s = await session({ fetch: async () => { calls++; return json({}); } }); t.after(s.close);
    const result = await s.client.callTool({ name, arguments: args });
    assert.equal(result.isError, true); assert.equal(calls, 0);
  });
}

test('A4: reserved characters in an identifier cannot become route structure', async t => {
  let called;
  const s = await session({ fetch: async url => { called = url; return json({}); } }); t.after(s.close);
  await s.client.callTool({ name: 'lax_get_offer', arguments: { id: 'a?b#c' } });
  assert.equal(new URL(called).pathname, '/registry/offers/a%3Fb%23c');
  assert.equal(new URL(called).search, '');
});

test('A5: optional diagnostics disclose metadata only, even on a failed submission', async t => {
  const events = [];
  const s = await session({ audit: event => events.push(event), fetch: async () => json({ error: 'synthetic rejection' }, 403) }); t.after(s.close);
  await s.client.callTool({ name: 'lax_submit', arguments: sampleSubmission });
  const serialized = JSON.stringify(events);
  for (const privateValue of [sampleSubmission.contact, sampleSubmission.payout_address, sampleSubmission.notes, 'authorization', 'headers']) {
    assert.ok(!serialized.includes(privateValue));
  }
  assert.deepEqual(Object.keys(events[0]).sort(), ['durationMs', 'outcome', 'status', 'tool']);
  assert.ok(Object.isFrozen(events[0]));
});

test('A5: an audit callback cannot crash a successful registry call', async t => {
  const s = await session({ audit: () => { throw new Error('broken logger'); }, fetch: async () => json({ ok: true }) }); t.after(s.close);
  assert.equal(value(await s.client.callTool({ name: 'lax_list_jobs', arguments: {} })).ok, true);
});

test('A4: read-only mode blocks the write while all read tools remain available', async t => {
  let calls = 0;
  const s = await session({ allowSubmit: false, fetch: async () => { calls++; return json({ ok: true }); } }); t.after(s.close);
  const result = await s.client.callTool({ name: 'lax_submit', arguments: sampleSubmission });
  assert.equal(result.isError, true); assert.match(text(result), /read-only/); assert.equal(calls, 0);
  assert.equal(value(await s.client.callTool({ name: 'lax_get_job', arguments: { id: 'x' } })).ok, true);
});

test('A3: aborted calls issue no upstream request', async () => {
  let calls = 0;
  const client = new RegistryClient({ fetch: async () => { calls++; return json({}); } });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(client.request('jobs', undefined, undefined, controller.signal), /cancelled/);
  assert.equal(calls, 0);
});

test('A3: oversized content-length is refused before reading its body', async () => {
  const client = new RegistryClient({ maxResponseBytes: 10, fetch: async () => new Response('{}', { headers: { 'content-length': '999' } }) });
  await assert.rejects(client.request('jobs'), /size limit/);
});

test('A4: unsafe configuration fails at construction', () => {
  for (const baseUrl of ['http://public.example/registry', 'https://a:b@registry.example', 'https://registry.example?token=secret', 'https://registry.example/#token']) {
    assert.throws(() => createLaxMcpServer({ baseUrl }));
  }
  for (const timeoutMs of [0, -1, 1.5, Infinity, 120001]) assert.throws(() => createLaxMcpServer({ timeoutMs }));
  assert.throws(() => createLaxMcpServer({ maxResponseBytes: 0 }));
});

test('A7: README documents both transports, client config, all tools, and publication status', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  for (const name of TOOL_NAMES) assert.ok(readme.includes(name));
  for (const required of ['mcpServers', 'stdio', 'Streamable HTTP', 'npm publish', 'submission/STATUS.md']) assert.ok(readme.includes(required), required);
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.ok(readme.includes(manifest.name), 'README must use the actual npm package name.');
});
