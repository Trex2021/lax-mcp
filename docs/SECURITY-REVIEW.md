# Security and reliability review, 23 October 2026

Candidate: 0.1.1. Original source: 0be67f9b4f779ceb2c4821d96a4e08826b2a948e.
Reviewed implementation merged in 5effbceeac280610adf00e35ef5f5cb277c3d3a5.
Status: local checks, five GitHub CI environments and main-branch CodeQL passed.

This is a source review, controlled local adversarial testing and automated
analysis. It is not an independent penetration-test certification. No attack,
load test, write or financial operation targeted Kognai infrastructure. The
optional live smoke check only uses the four documented public GETs.

## Scope and boundaries

Reviewed every production TypeScript file, build/release/test script, test suite,
dependency lockfile and workflow. MCP arguments and registry replies are
untrusted. Startup settings and diagnostic hooks are operator-supplied. The
HTTP CLI binds to loopback; public TLS and multi-tenant OAuth are not implemented.
No wallet or signing key is loaded. An artifact URL is forwarded as data and
never fetched. The MCP client owns submission approval and treatment of
untrusted descriptions. Tests do not establish a client's resistance to prompt
injection; they establish that this server does not automatically execute it.

## Fixed behavior and hardening

| Area | Prior behavior or risk | Change and evidence |
| --- | --- | --- |
| Async diagnostics | A rejecting async hook could terminate Node and expose its exception on stderr. This requires an operator-supplied hook. | Contain sync and async failures. A strict-rejection subprocess checks continued operation and marker privacy. |
| Nested JSON | Pretty printing could expand a small valid reply into a much larger tool result. | Return validated, bounded response text. The nesting test checks byte size and data equivalence. |
| Host syntax | URL parsing tolerated queries, fragments and slashes in Host. | Reject malformed authorities before routes, tested on the wire. No remote authentication or DNS-rebinding exploit is claimed. |
| Encoding integrity | HTTP decoding replaced invalid UTF-8 and accepted other UTF encodings. | Fatal UTF-8 validation and charset checks reject invalid bytes and UTF-16 before registry I/O. |
| Resource limits | No application admission bound; stdio used the SDK's larger default buffer. | Default 16 HTTP requests, no queue or retry; 64 listener connections and finite header/body-arrival time; 64 KiB stdio buffer with explicit closure. |
| Startup settings | Later mutation of the operator's options object could change authentication, writes and origins. This is trusted code, not a remote exploit. | Capture values and copy allowlists. Tests mutate the original object and verify protections remain. |
| Release hygiene | TypeScript can retain stale output; the earlier package check lacked an exact allowlist. | Clean dist before building and require the exact 19-file release manifest. A synthetic stale file was removed; the actual archive was installed separately. |
| Platform checks | Shell globbing and direct npm.cmd spawning depend on the platform. | Enumerate tests without a shell, run npm's JS entry and test the installed bin through offline npm exec. |

The current 18-test adversarial corpus was run against the original source in
an isolated temporary checkout: 9 passed and 9 failed as expected. This includes
new hardening requirements and does not mean nine independently exploitable
vulnerabilities. SDK handling of __proto__ was verified safe and not reported as
a finding.

## Recorded checks

| Check | Observed result | Evidence |
| --- | --- | --- |
| Node 24 and Node 20.20.2 suites | 77 passed, 0 failed on each | [Node 24](../evidence/security/coverage-node24.txt), [Node 20](../evidence/security/tests-node20.txt) |
| Original-source regression corpus | 18 tests, 9 expected failures | [baseline](../evidence/security/baseline-security.txt) |
| Targeted planted regressions | All 8 detected, originals restored | [mutations](../evidence/mutations.json) |
| Local pressure | 200 requests, peak 4 at limit 4, recovery passed, no response mixups | [record](../evidence/security/local-pressure.json) |
| npm production and dev advisory lookup | 0 known advisories at check time | [audit](../evidence/security/dependency-audit.json) |
| Gitleaks 8.30.1, original complete Git history | 0 detections across 3 commits | [history](../evidence/security/gitleaks-history.json) |
| Gitleaks, current first-party files | 0 detections, redacted output enabled | [current tree](../evidence/security/gitleaks-current.json) |
| Semgrep CE | 0 reported findings and parse errors for configured packs | [result](../evidence/security/semgrep.json), [scope](../evidence/security/semgrep.txt) |
| Clean tarball install | Factory, HTTP export, SDK client and executable passed | [package](../evidence/package.json) |
| GitHub Actions, main | 77 tests passed in each of five environments; demo, local pressure and clean package checks passed; eight mutations detected on Linux 24 | [CI record](../evidence/security/ci.json), [run](https://github.com/Trex2021/lax-mcp/actions/runs/40014019642) |
| CodeQL 2.27.3, main | security-and-quality: 0 reported results; successful extraction of all five production files; no diagnostic warnings or errors | [inspected SARIF summary](../evidence/security/codeql.json), [run](https://github.com/Trex2021/lax-mcp/actions/runs/40014019651) |

Semgrep uses p/javascript, p/typescript and p/github-actions with metrics off.
First-party TS, MJS and workflow YAML are included. Generated output,
node_modules, evidence and archives are excluded from static analysis; package
output is checked separately. [Tool provenance](../evidence/security/tooling.json)
records versions and scope. Rules and advisory databases may change. Zero
results describe these checks at this time and do not prove absence of defects.
The main CI matrix covered Ubuntu with Node 20.20.2, 22.23.3 and 24.21.0,
plus Windows and macOS with Node 24.22.1. Test totals were read from each job's
log. The actual CodeQL artifact was downloaded, its archive digest verified,
and its SARIF inspected. Its summary records the archive and SARIF hashes,
extracted paths and artifact expiry. The earlier PR scan used diff-informed
analysis; the reported main scan did not contain that PR filter.
[Source hashes](../evidence/security/source-inventory.json) identify the original
reviewed runtime, tests, scripts, configuration and workflows. The later npm
scope update changed package naming, the package smoke-check imports and the
README assertion. Production TypeScript and locked dependency versions are
unchanged. [Release hashes](../evidence/publication/source-inventory.json) and
[release CI](../evidence/publication/ci.json) identify and verify that candidate.

## Limits and outstanding gates

The Codex Security deep-scan coordinator is unavailable in this session. That
specific scan was not run; no canonical Codex Security report or invented
token/coverage measurements are claimed. No hosted reverse proxy, production
traffic capacity, actual Claude Desktop UI session, organizer hidden tests,
third-party penetration test or npm publication is certified by these results.
Authentication, approval and review of untrusted text remain necessary at the
client and deployment boundaries. Local tests cannot establish zero bugs.

Listing, wallet authorization, bid, PACT and npm publication remain separate
gates in [entry status](../submission/STATUS.md). No ranking or payment guarantee
follows from this review.

Primary guidance: [MCP transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports),
[MCP security](https://modelcontextprotocol.io/docs/2025-11-25/tutorials/security/security_best_practices),
[CodeQL setup](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configuring-advanced-setup-for-code-scanning).
