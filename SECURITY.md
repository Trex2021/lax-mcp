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

All optional diagnostics are bounded metadata. Protocol results can contain
the registry's public content, including text it returns. Do not capture MCP
request/response traffic in public logs: submissions themselves contain the
contact and payout address the caller deliberately supplied.

Tests cover path boundaries, schema rejection, timeouts, oversized replies,
error recovery, metadata privacy, HTTP protections and actual transports. They
are not a guarantee of absence of vulnerabilities. No independent security
audit is claimed.

Report a concern through the operator's verified GitHub contact. Never include
keys, payment signatures or personal data in a public issue.
