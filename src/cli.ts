#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createLaxMcpServer, VERSION } from './index.js';
import { startLaxHttpServer } from './http.js';
import type { LaxMcpOptions } from './registry.js';

const help = `lax-mcp ${VERSION}
Usage: lax-mcp [--http] [--port NUMBER] [--base-url URL] [--read-only]

Without --http, MCP runs on stdio. HTTP binds to 127.0.0.1 only, at /mcp.
--port overrides PORT (default 3000). Reads are free. No wallet is loaded.
--read-only prevents every submission, including owner-approved submissions.
Set LAX_MCP_TOKEN to require a bearer token in HTTP mode.
Set LAX_REGISTRY_URL to override the registry without changing client config.
--help prints this guide to stderr. --version prints the version to stderr.
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let http = false;
  let readOnly = false;
  let portValue: string | undefined;
  let baseUrl = process.env.LAX_REGISTRY_URL;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') { process.stderr.write(help); return; }
    if (arg === '--version' || arg === '-v') { process.stderr.write(VERSION + '\n'); return; }
    if (arg === '--http') { http = true; continue; }
    if (arg === '--read-only') { readOnly = true; continue; }
    if (arg === '--port' || arg === '--base-url') {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error('An option value is missing. Use --help.');
      if (arg === '--port') portValue = value; else baseUrl = value;
      continue;
    }
    throw new Error('Unknown option. Use --help.');
  }
  if (!http && portValue !== undefined) throw new Error('--port requires --http.');
  const options: LaxMcpOptions = { allowSubmit: !readOnly, ...(baseUrl === undefined ? {} : { baseUrl }) };
  if (http) {
    const value = portValue ?? process.env.PORT ?? '3000';
    if (!/^\d+$/.test(value) || Number(value) > 65535) throw new Error('PORT must be an integer between 0 and 65535.');
    const token = process.env.LAX_MCP_TOKEN;
    const server = await startLaxHttpServer({ ...options, port: Number(value), ...(token === undefined ? {} : { token }) });
    const address = server.address();
    const port = address && typeof address === 'object' ? address.port : 'unknown';
    process.stderr.write(`[lax-mcp] ready at http://127.0.0.1:${port}/mcp\n`);
    const stop = (): void => { server.closeAllConnections(); server.close(() => process.exit(0)); };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  } else {
    const server = createLaxMcpServer(options);
    await server.connect(new StdioServerTransport());
    const stop = (): void => { void server.close().finally(() => process.exit(0)); };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  }
}

main().catch(() => {
  // Do not log exception text: arguments or a dependency may put secrets in it.
  process.stderr.write('[lax-mcp] Startup failed. Check options and configuration with --help.\n');
  process.exitCode = 1;
});
