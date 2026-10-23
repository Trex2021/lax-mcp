import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startLaxHttpServer } from '../dist/http.js';

const started = new Date().toISOString();
let active = 0; let peak = 0; let upstreamCalls = 0; let next = 0;
const outcomes = [];
const limit = 4; const total = 200; const workers = 8;
const server = await startLaxHttpServer({ port: 0, maxConcurrentRequests: limit,
  baseUrl: 'https://registry.example.invalid/registry',
  fetch: async (url, init) => {
    const parsed = new URL(url);
    assert.equal(parsed.hostname, 'registry.example.invalid'); assert.equal(init.method, 'GET');
    active++; upstreamCalls++; peak = Math.max(peak, active);
    try {
      await new Promise(resolve => setTimeout(resolve, 15));
      return new Response(JSON.stringify({ id: decodeURIComponent(parsed.pathname.split('/').at(-1)) }));
    } finally { active--; }
  },
});
const base = `http://127.0.0.1:${server.address().port}`;
const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-11-25' };
async function call(i) {
  const expected = `fixture-pressure-${i}`;
  const result = await fetch(base + '/mcp', { method: 'POST', headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: i + 1, method: 'tools/call', params: { name: 'lax_get_job', arguments: { id: expected } } }) });
  const body = await result.json();
  assert.ok([200, 503].includes(result.status), `Unexpected HTTP ${result.status}`);
  if (result.status === 200) {
    assert.equal(body.id, i + 1); assert.equal(JSON.parse(body.result.content[0].text).id, expected);
  }
  outcomes.push(result.status);
}
try {
  await Promise.all(Array.from({ length: workers }, async () => {
    while (next < total) { const i = next++; await call(i); }
  }));
  assert.equal(outcomes.length, total); assert.ok(outcomes.includes(200) && outcomes.includes(503));
  assert.ok(peak <= limit); assert.equal(active, 0);
  assert.equal((await fetch(base + '/health')).status, 200);
  await call(total); assert.equal(outcomes.at(-1), 200);
  const report = { kind: 'controlled-loopback-pressure', started, finished: new Date().toISOString(),
    node: process.version, externalNetwork: false, writes: 0, fixtureOnly: true,
    burstRequests: total, workers, configuredConcurrentLimit: limit, peakUpstreamConcurrency: peak,
    accepted: outcomes.slice(0, total).filter(x => x === 200).length,
    busy: outcomes.slice(0, total).filter(x => x === 503).length,
    requestResponseMixups: 0, upstreamCalls, healthAfterBurst: 200, recoveryCall: 200, passed: true,
    note: 'A bounded local overload check, not a production capacity benchmark or a test of organizer infrastructure.' };
  await mkdir('evidence/security', { recursive: true });
  await writeFile('evidence/security/local-pressure.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }); }
