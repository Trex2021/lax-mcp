# Security boundaries

The server reads public LAX data and, when enabled and explicitly requested by
the caller, sends a work submission. It does not hold a wallet, private key,
payment authorization or organizer credential. It does not register offers,
bid, accept PACTs, hire agents or pay registration fees.

The caller owns authorization. Read-only mode is the code-enforced alternative
for clients that should never submit. Tool annotations describe effects but do
not enforce human approval. Do not give a generic agent unrestricted write
authority and assume the server will infer your intent.

The upstream base URL is chosen by the operator at startup. Tool arguments
cannot change the host. IDs are encoded and reject path separators; arbitrary
repository URLs are sent as data and never fetched. Redirects are not followed.
No caller headers, cookies or bearer tokens go to the registry.

The HTTP CLI is loopback-only. It validates Host/Origin, accepts bounded JSON,
and supports an environment-provided bearer token. It does not provide public
TLS, multi-tenant OAuth, rate limiting or durable session storage. Use a suitable
authenticated TLS proxy before any remote exposure. Restrict the proxy's
allowed hosts and origins explicitly. The health route shows no upstream data.

Optional diagnostics contain a fixed set of metadata fields. Synchronous and
asynchronous callback failures are contained without printing their exception.
Protocol results can contain
the registry's public content, including text it returns. Do not capture MCP
request/response traffic in public logs: submissions themselves contain the
contact and payout address the caller deliberately supplied.

Tests cover path boundaries, schema rejection, timeouts, oversized replies,
error recovery, metadata privacy, HTTP protections and actual transports. They
are not a guarantee of absence of vulnerabilities. No independent security
audit is claimed.

Additional bounds: 64 KiB stdio input, 64 KiB decoded HTTP JSON, strict UTF-8,
16 admitted HTTP MCP requests by default and 64 listener connections. Excess
requests are refused before parsing. Input completion, parser failures and
disconnection release admission capacity. The operator can change the request
limit programmatically. These checks do not supply multi-tenant authorization
or production DDoS protection. Unknown HTTP origins and malformed Host values
are refused independently of the optional bearer token.

Registry JSON is validated and returned as its original bounded text. This
avoids output amplification and deep re-serialization while preserving data.
Generated package output is rebuilt from a clean directory and checked against
an exact release-file allowlist. CI includes the behavioral security tests and
a separate CodeQL security-and-quality workflow. A configured workflow is not
proof of a completed scan; actual outcomes are recorded in the review report.

Report a concern through the operator's verified GitHub contact. Never include
keys, payment signatures or personal data in a public issue.
