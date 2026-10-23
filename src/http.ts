import express from 'express';
import type { Express, Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';
import type { Server } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createLaxMcpServer, VERSION } from './index.js';
import type { LaxMcpOptions } from './registry.js';

export interface LaxHttpOptions extends LaxMcpOptions {
  token?: string;
  allowedHosts?: string[];
  allowedOrigins?: string[];
}

function tokenMatches(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createLaxHttpApp(options: LaxHttpOptions = {}): Express {
  // Validate configuration on startup, not on the first caller's request.
  const probe = createLaxMcpServer(options);
  void probe.close();
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  const hosts = new Set(options.allowedHosts ?? ['127.0.0.1', 'localhost', '[::1]']);
  if (options.token !== undefined && !options.token.trim()) throw new Error('The HTTP token must not be empty.');
  app.use((req, res, next) => {
    let authority: URL;
    try { authority = new URL(`http://${req.headers.host ?? ''}`); }
    catch { res.status(403).json({ error: 'Host is not allowed.' }); return; }
    if (!hosts.has(authority.hostname) || authority.username || authority.password || authority.pathname !== '/') {
      res.status(403).json({ error: 'Host is not allowed.' }); return;
    }
    const origin = req.headers.origin;
    const origins = options.allowedOrigins ?? [authority.origin];
    if (origin !== undefined && !origins.includes(origin)) {
      res.status(403).json({ error: 'Origin is not allowed.' }); return;
    }
    if (options.token !== undefined && !tokenMatches(req.headers.authorization ?? '', `Bearer ${options.token}`)) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="lax-mcp"');
      res.status(401).json({ error: 'Authentication required.' }); return;
    }
    next();
  });
  app.get('/health', (_req, res) => { res.json({ status: 'ready', version: VERSION }); });
  app.use('/mcp', express.json({ limit: '64kb', strict: true }));
  app.post('/mcp', async (req, res) => {
    if (!req.is('application/json')) { res.status(415).json({ error: 'Use application/json.' }); return; }
    const server = createLaxMcpServer(options);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.once('close', () => { void transport.close(); void server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'MCP request failed.' } });
      else res.end();
    }
  });
  app.all('/mcp', (_req, res) => {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'This stateless endpoint supports POST only.' } });
  });
  app.use((_req, res) => { res.status(404).json({ error: 'Not found.' }); });
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const oversized = !!error && typeof error === 'object' && 'type' in error && error.type === 'entity.too.large';
    res.status(oversized ? 413 : 400).json({ error: oversized ? 'Request is too large.' : 'Request is not valid JSON.' });
  });
  return app;
}

export async function startLaxHttpServer(options: LaxHttpOptions & { port?: number } = {}): Promise<Server> {
  const port = options.port ?? 3000;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('port must be between 0 and 65535.');
  const app = createLaxHttpApp(options);
  return await new Promise<Server>((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1', () => resolve(server));
    server.once('error', reject);
  });
}
