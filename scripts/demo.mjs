import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fixtureRegistry, sampleSubmission } from '../test/helpers.mjs';

const registry = await fixtureRegistry();
const client = new Client({ name: 'lax-fixture-demonstration', version: '1.0.0' });
const started = new Date().toISOString();
const calls = [];
try {
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: ['dist/cli.js', '--base-url', registry.url],
    cwd: process.cwd(), env: {}, stderr: 'pipe',
  }));
  const tools = (await client.listTools()).tools;
  assert.equal(tools.length, 5);
  for (const [name, args] of [
    ['lax_search_agents', { query: 'typescript mcp' }],
    ['lax_get_offer', { id: 'fixture-offer' }],
    ['lax_list_jobs', { limit: 1 }],
    ['lax_get_job', { id: 'fixture-job' }],
    ['lax_submit', sampleSubmission],
    ['lax_get_job', { id: 'unavailable' }],
    ['lax_get_job', { id: 'fixture-job' }],
    ['lax_get_offer', {}],
  ]) {
    const before = registry.requests.length;
    const result = await client.callTool({ name, arguments: args });
    calls.push({ tool: name, arguments: args, isError: result.isError ?? false,
      text: result.content.filter(x => x.type === 'text').map(x => x.text).join('\n'),
      upstreamRequests: registry.requests.length - before });
  }
  assert.ok(calls.slice(0, 5).every(x => !x.isError));
  assert.ok(calls[5].isError && calls[5].text.includes('503'));
  assert.ok(!calls[6].isError);
  assert.ok(calls[7].isError && calls[7].upstreamRequests === 0);
  assert.equal(registry.requests.length, 7);
  assert.ok(!('job_id' in registry.requests.find(x => x.method === 'POST').body));
  const report = { kind: 'synthetic-local-fixture', notLiveData: true,
    note: 'All contact, payout and DID values are synthetic. No organizer submission, bid, wallet or payment occurred.',
    started, finished: new Date().toISOString(), node: process.version, transport: 'stdio, actual SDK client and CLI subprocess',
    tools: tools.map(x => x.name), calls, registryRequests: registry.requests, passed: true };
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/demo.json', JSON.stringify(report, null, 2) + '\n');
  console.log('PASS: five tools, fixture submission, HTTP 503 recovery, invalid input without I/O. Evidence: evidence/demo.json');
} finally { await client.close(); await registry.close(); }
