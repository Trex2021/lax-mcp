import express from 'express';
import type { Express, Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { MIMEType } from 'node:util';
import type { Server } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createLaxMcpServer, VERSION } from './index.js';
import type { LaxMcpOptions } from './registry.js';

export interface LaxHttpOptions extends LaxMcpOptions {
  token?: string;
  allowedHosts?: string[];
  allowedOrigins?: string[];
  /** Reject additional MCP requests before parsing. Defaults to 16; no queue. */
  maxConcurrentRequests?: number;
}

function tokenMatches(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createLaxHttpApp(options: LaxHttpOptions = {}): Express {
  // Freeze configuration values used by future requests. Mutation of the
  // caller's options must not silently re-enable writes or change an origin.
  const config = { ...options };
  const origins = options.allowedOrigins === undefined ? undefined : [...options.allowedOrigins];
  const maxConcurrent = options.maxConcurrentRequests ?? 16;
  if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 1024) {
    throw new Error('maxConcurrentRequests must be an integer from 1 to 1024.');
  }
  let active = 0;
  // Validate configuration on startup, not on the first caller's request.
  const probe = createLaxMcpServer(config);
  void probe.close();
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  const hosts = new Set(options.allowedHosts ?? ['127.0.0.1', 'localhost', '[::1]']);
  if (options.token !== undefined && !options.token.trim()) throw new Error('The HTTP token must not be empty.');
  app.use((req, res, next) => {
    let authority: URL;
    const host = req.headers.host ?? '';
    // Host is an authority, not a URL. URL parsing alone silently accepts
    // fragments, queries, userinfo and a trailing slash in this header.
    try {
      if (!host || /[\s\x00-\x1f\x7f/?#@\\]/.test(host)) throw new Error('Invalid authority');
      authority = new URL(`http://${host}`);
    }
    catch { res.status(403).json({ error: 'Host is not allowed.' }); return; }
    if (!hosts.has(authority.hostname) || authority.username || authority.password || authority.pathname !== '/') {
      res.status(403).json({ error: 'Host is not allowed.' }); return;
    }
    const origin = req.headers.origin;
    const acceptedOrigins = origins ?? [authority.origin];
    if (origin !== undefined && !acceptedOrigins.includes(origin)) {
      res.status(403).json({ error: 'Origin is not allowed.' }); return;
    }
    if (config.token !== undefined && !tokenMatches(req.headers.authorization ?? '', `Bearer ${config.token}`)) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="lax-mcp"');
      res.status(401).json({ error: 'Authentication required.' }); return;
    }
    next();
  });
  app.get('/health', (_req, res) => { res.json({ status: 'ready', version: VERSION }); });
  app.use('/mcp', (req, res, next) => {
    if (req.method !== 'POST') { next(); return; }
    try {
      const type = new MIMEType(req.headers['content-type'] ?? '');
      const charset = type.params.get('charset')?.toLowerCase();
      if (type.essence !== 'application/json' || (charset !== undefined && charset !== 'utf-8')) {
        res.status(415).json({ error: 'Use UTF-8 application/json.' }); return;
      }
    } catch { res.status(415).json({ error: 'Use UTF-8 application/json.' }); return; }
    if (active >= maxConcurrent) {
      res.status(503).json({ error: 'MCP request capacity reached. Try again later.' }); return;
    }
    active++;
    let released = false;
    const release = (): void => {
      if (released) return;
      released = true; active--;
      res.off('finish', release); res.off('close', release);
    };
    res.once('finish', release); res.once('close', release);
    next();
  });
  app.use('/mcp', express.json({ limit: '64kb', strict: true,
    verify: (_req, _res, buffer) => {
      // The default decoder substitutes invalid UTF-8. Reject it instead of
      // changing the caller's arguments before validation or upstream I/O.
      new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    },
  }));
  app.post('/mcp', async (req, res) => {
    if (!req.is('application/json')) { res.status(415).json({ error: 'Use application/json.' }); return; }
    const server = createLaxMcpServer(config);
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
    server.headersTimeout = 10_000;
    server.requestTimeout = 30_000;
    server.keepAliveTimeout = 5_000;
    server.maxRequestsPerSocket = 100;
    server.maxConnections = 64;
    server.once('error', reject);
  });
}
