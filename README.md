# LAX MCP server

Five LAX registry tools for any compatible MCP client. Built for the Kognessium
LAX MCP server job, operated by Ehsan Benvari. AI implementation: Codex.

**Release status: source candidate, not yet published to npm.** The package name
`@trex2021/lax-mcp` is proposed; ownership of that npm scope has not been verified.
No claim of contest registration, bid acceptance, PACT agreement or prize payment
is made by this repository. See [entry status](submission/STATUS.md).

## Start in under 15 minutes

Node 20 or newer and npm are required. From a clean source checkout:

```sh
npm ci --ignore-scripts
npm test
node dist/cli.js --read-only
```

The last command starts MCP on **stdio**, so an idle terminal is expected. An MCP
client supplies the requests. No wallet, API key or funds are needed for reads.
The stdio input buffer is limited to 64 KiB. Exceeding the limit
closes the input transport and exits without printing the input contents.

## Claude Desktop configuration

Build the checkout first, then set the absolute path appropriate to your machine:

```json
{
  "mcpServers": {
    "lax": {
      "command": "node",
      "args": ["/absolute/path/to/kognessium-lax-mcp/dist/cli.js", "--read-only"]
    }
  }
}
```

On Windows the JSON path can be `C:/tools/kognessium-lax-mcp/dist/cli.js`.
Remove `--read-only` only when you want the client to be able to submit work.
The owner must approve the exact submission before a client calls `lax_submit`.

## Streamable HTTP

```sh
node dist/cli.js --http --port 3000 --read-only
```

The MCP URL is `http://127.0.0.1:3000/mcp`. The ready message goes to stderr.
`PORT` is supported; `--port` takes precedence. There are no SSE sessions to
store, so GET and DELETE return 405. POST implements Streamable HTTP, not the
deprecated HTTP+SSE transport.

The CLI binds to loopback only. Host and Origin checks block browser requests
from other origins; there is no permissive CORS policy. For local bearer
authentication set `LAX_MCP_TOKEN` in the environment of the server and configure
the same bearer token in your HTTP client. Keep credentials out of command lines
and source control. For an actual remote deployment, put a TLS/authentication
proxy in front of loopback and explicitly configure its hosts and origins in
`createLaxHttpApp`; the CLI deliberately provides no unauthenticated public bind.

The package subpath `@trex2021/lax-mcp/http` exports `createLaxHttpApp` and
`startLaxHttpServer`. Optional `allowedHosts`, `allowedOrigins` and `token` apply
to both `/mcp` and `/health`. UTF-8 JSON requests are limited to 64 KiB after
decompression. Invalid UTF-8 and other character encodings are refused before
registry I/O. At most 16 MCP POST requests are admitted concurrently by default;
additional requests receive 503 without a queue or retry. Programmatic
`maxConcurrentRequests` accepts 1 to 1024. The CLI listener also limits connections
to 64, request headers to 10 seconds and request-body arrival to 30 seconds.
These local bounds complement authentication; they are not a public-service
rate limit. Startup configuration is captured, so later mutation of its object
does not re-enable submissions, change authentication or expand origins.

## Embed in another client or test

```js
import { createLaxMcpServer } from './dist/index.js';

const server = createLaxMcpServer({
  baseUrl: 'https://lax.kognai.ai/registry',
  fetch: globalThis.fetch,
  timeoutMs: 15000,
  maxResponseBytes: 1048576,
  allowSubmit: false
});
// Returns the SDK's McpServer, not connected yet.
// Connect any SDK-compatible transport yourself.
```

`baseUrl` and `fetch` are injectable. HTTP is accepted for a loopback fixture;
other upstreams must use HTTPS. Registry URLs cannot contain credentials, query
strings or fragments. The default URL can also be set with `LAX_REGISTRY_URL`
or `--base-url`. The client uses the same registry for all five tools.

## Tools and exact examples

The examples below are MCP `tools/call` parameters. All values in the write
example are synthetic. Do not send it to the live organizer.

### `lax_search_agents`

```json
{"name":"lax_search_agents","arguments":{"query":"typescript mcp"}}
```

Free GET `/search?query=typescript+mcp`. `query` is optional, at most 100
characters. Empty arguments search without a query.

### `lax_get_offer`

```json
{"name":"lax_get_offer","arguments":{"id":"replace-with-a-real-offer-id"}}
```

Free GET `/offers/<id>`. Identifiers are safely encoded as one path component.

### `lax_list_jobs`

```json
{"name":"lax_list_jobs","arguments":{"track":"godman-protocols","limit":10,"offset":0}}
```

Free GET `/jobs?track=godman-protocols&limit=10&offset=0`. Tracks match the
registry's OpenAPI enum. `limit` is an integer from 1 to 100 and `offset` is a
nonnegative integer. All three filters are optional.

### `lax_get_job`

```json
{"name":"lax_get_job","arguments":{"id":"a14478ee-35f7-4457-843a-482f25af6dad"}}
```

Free GET `/jobs/<id>`. Inspect current requirements before bidding or working.

### `lax_submit`

```json
{
  "name": "lax_submit",
  "arguments": {
    "job_id": "replace-with-a-real-job-id",
    "builder": "Fixture Builder",
    "contact": "fixture@example.invalid",
    "repo_or_patch_url": "https://example.invalid/review",
    "payout_address": "0x1212121212121212121212121212121212121212",
    "agent_did": "did:web:example.invalid:fixture",
    "notes": "Synthetic example. Do not submit to the live service."
  }
}
```

POST `/jobs/<job_id>/submissions`, with `job_id` excluded from the JSON body.
The link must use HTTPS without credentials. The payout address must be `0x`
followed by exactly 40 hexadecimal characters. A valid DID is required; notes
are optional, at most 2000 characters. Invalid fields are refused before I/O.

**This tool shares the supplied contact and payout address with Kognai.** It
does not register a LAX offer, bid, sign, transfer funds or accept a PACT. The
current competition's signed bid/PACT flow is separate from this specified
submission endpoint. A registered tool is not permission to use it. Configure
`allowSubmit: false` or `--read-only` to enforce a write block in code.

## Errors, cancellation and privacy

- Success returns validated registry JSON text, preserving its bounded wire
  representation without expanding deeply nested data through pretty printing.
- Registry 4xx/5xx errors return `isError: true`, the HTTP status and a bounded
  registry error message. HTML error pages are not echoed.
- Network failures, invalid JSON, response-size limits, cancellation and timeout
  also return tool errors. A failed call does not stop the server.
- Requests time out after 15 seconds by default, even with an injected fetch
  that ignores abort. Responses are bounded to 1 MiB by default.
- No automatic request retries: a failed write is not silently submitted twice.
- Redirects are not followed. No caller headers are forwarded to the registry.
- The factory makes no console calls. The CLI uses stderr for diagnostics and
  stdout only for MCP protocol messages. HTTP access logs are not enabled.
- Optional `audit` callbacks receive only tool name, outcome, duration and HTTP
  status, never contacts, payout addresses, request headers, arguments or bodies.
  Both synchronous exceptions and rejected asynchronous callbacks are contained.

Registry data remains untrusted. It cannot authorize tool use, spending,
communications or changes to this server. See [SECURITY.md](SECURITY.md).
The [security and reliability review](docs/SECURITY-REVIEW.md) records fixes,
adversarial tests, scanner coverage and outstanding verification gates.

## Verify the candidate

```sh
npm test
npm run test:coverage
npm run test:security
npm run test:pressure
npm run test:mutations
npm run test:package
npm run demo
npm run smoke:live
npm run pack:check
```

`npm test` uses in-memory MCP transport and local registry fixtures. It never
calls a live submission endpoint. The transport tests use actual SDK clients
and a subprocess for stdio, plus a real loopback HTTP listener.

`npm run demo` records a synthetic, offline end-to-end client run against a
local registry. It is explicitly a fixture demonstration, not live Kognai data.
`npm run smoke:live` performs only public GET requests through actual MCP tools
and records what succeeded or failed. A live outage is recorded as an outage.
`npm run test:mutations` deliberately introduces eight regressions into compiled
local files, verifies that assertions fail, then restores the files. Run it
alone, never concurrently with a build or tests. This is a targeted check,
not an exhaustive mutation score. `npm run test:package` installs the actual
tarball into a fresh temporary directory and checks package imports, an SDK
client and the executable bin. Installing dependencies requires npm access.
The build clears generated output first. The package check uses an exact
release-file allowlist, so stale output cannot silently enter the tarball.

See [acceptance matrix](docs/ACCEPTANCE.md) and the evidence directory for actual
results, or the [recorded verification](docs/VERIFICATION.md). Publication and
participation remain separate gates.

## Package and publish

```sh
npm run build
npm run check
npm pack --ignore-scripts
# Once the operator confirms a controlled npm scope and account:
npm publish --access public --ignore-scripts
```

The tarball contains compiled JS/declarations, README, LICENSE and SECURITY.md.
It excludes tests, contest records and credentials. There is no install script.
Publication requires the operator's npm credentials/2FA and verified scope
ownership. Until a successful registry readback, `npx @trex2021/lax-mcp` is not
an advertised installation path.

## Provenance

- [LAX job](https://lax.kognai.ai/registry/jobs/a14478ee-35f7-4457-843a-482f25af6dad)
- [Registry OpenAPI](https://lax.kognai.ai/openapi.json)
- [Kognessium rules](https://www.kognai.ai/docs/hackathon)
- [Build in Kognai](https://www.kognai.ai/docs/build-in-kognai)
- [MCP transport specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)

The pinned MCP SDK is 1.32.1, matching the job's SDK 1.x requirement. Sources
are under MIT; this is an independent candidate, not an official Kognai product.
