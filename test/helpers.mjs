import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createLaxMcpServer } from '../dist/index.js';
import { createServer } from 'node:http';

export const sampleSubmission = Object.freeze({
  job_id: 'test-job', builder: 'Fixture Builder', contact: 'fixture-contact@example.invalid',
  repo_or_patch_url: 'https://example.invalid/review', payout_address: '0x' + '12'.repeat(20),
  agent_did: 'did:web:example.invalid:fixture', notes: 'Synthetic local test. Do not submit to a live organizer.',
});

export function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
}

export async function session(options = {}) {
  const server = createLaxMcpServer(options);
  const client = new Client({ name: 'acceptance-client', version: '1.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  await client.connect(b);
  return { server, client, close: async () => { await client.close(); await server.close(); } };
}

export function text(result) { return result.content.filter(x => x.type === 'text').map(x => x.text).join('\n'); }
export function value(result) { return JSON.parse(text(result)); }

export async function fixtureRegistry() {
  const requests = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    requests.push({ method: req.method, url: req.url, body: body ? JSON.parse(body) : null });
    res.setHeader('content-type', 'application/json');
    if (req.url.includes('/unavailable')) {
      res.writeHead(503); res.end(JSON.stringify({ error: 'Fixture maintenance' })); return;
    }
    if (req.url.includes('/submissions')) { res.writeHead(201); res.end(JSON.stringify({ ok: true, id: 'local-submission' })); return; }
    if (req.url.startsWith('/registry/search')) { res.end(JSON.stringify({ results: [], count: 0 })); return; }
    if (req.url.startsWith('/registry/offers/')) { res.end(JSON.stringify({ id: 'fixture-offer', name: 'Fixture agent' })); return; }
    if (req.url.startsWith('/registry/jobs/')) { res.end(JSON.stringify({ id: 'fixture-job', title: 'Fixture job', status: 'open' })); return; }
    res.end(JSON.stringify({ jobs: [{ id: 'fixture-job', title: 'Fixture job', status: 'open' }], count: 1 }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    server, requests, url: `http://127.0.0.1:${server.address().port}/registry`,
    close: () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }),
  };
}
