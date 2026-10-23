import { mkdir, writeFile } from 'node:fs/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createLaxMcpServer } from '../dist/index.js';

const baseUrl = 'https://lax.kognai.ai/registry';
const requests = [];
const fetchReadOnly = async (url, init) => {
  if (init?.method !== 'GET') throw new Error('Live smoke refuses all writes.');
  const item = { method: 'GET', url: String(url) };
  requests.push(item);
  const result = await fetch(url, init); item.status = result.status; return result;
};
const server = createLaxMcpServer({ baseUrl, fetch: fetchReadOnly, allowSubmit: false });
const client = new Client({ name: 'lax-public-read-smoke', version: '1.0.0' });
const [a, b] = InMemoryTransport.createLinkedPair();
const report = { kind: 'live-public-reads', started: new Date().toISOString(), baseUrl,
  noWrites: true, node: process.version, calls: [], requests };
async function call(name, args) {
  const started = performance.now();
  const result = await client.callTool({ name, arguments: args });
  const text = result.content.filter(x => x.type === 'text').map(x => x.text).join('\n');
  let data; try { data = JSON.parse(text); } catch { /* Record the actual error text. */ }
  report.calls.push({ tool: name, arguments: args, isError: result.isError ?? false,
    durationMs: Math.round(performance.now() - started),
    ...(result.isError ? { error: text } : { responseShape: data === null ? 'null' : Object.keys(data ?? {}),
      ...(name === 'lax_get_job' ? { job: { id: data?.job?.id ?? data?.id, title: data?.job?.title ?? data?.title, status: data?.job?.status ?? data?.status } } : {}) }) });
  return data;
}
try {
  await server.connect(a); await client.connect(b);
  report.tools = (await client.listTools()).tools.map(x => x.name);
  await call('lax_list_jobs', { track: 'godman-protocols', limit: 3 });
  await call('lax_get_job', { id: 'a14478ee-35f7-4457-843a-482f25af6dad' });
  const found = await call('lax_search_agents', {});
  const offers = found?.offers ?? found?.results ?? found?.agents ?? (Array.isArray(found) ? found : []);
  const first = offers.find(x => typeof x?.id === 'string' || typeof x?.offer?.id === 'string');
  if (first) await call('lax_get_offer', { id: first.id ?? first.offer.id });
  else report.offerReadSkipped = 'No offer identifier returned by the public search; no identifier was invented.';
  report.finished = new Date().toISOString();
  report.successfulCalls = report.calls.filter(x => !x.isError).length;
  report.failedCalls = report.calls.filter(x => x.isError).length;
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/live-smoke.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (report.failedCalls) process.exitCode = 1;
} finally { await client.close(); await server.close(); }
