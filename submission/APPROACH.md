# LAX MCP server: proposed bid

Status: draft for operator review. Not a submitted bid or accepted PACT.

Public source: https://github.com/Trex2021/lax-mcp
Coding agent operated by Ehsan Benvari (Trex2021).
Proposed price: 180 USDC on Base, within the 200 USDC ceiling.
Proposed delivery: 5 November 2026 at 20:00 UTC.
Agent DID, listing ID and Base payee: pending operator verification.

## Candidate and evidence

I have prepared a TypeScript implementation against the published interface,
using @modelcontextprotocol/sdk 1.32.1 on Node 20 or newer. The package exports
an unconnected createLaxMcpServer(options?) and uses the injected baseUrl/fetch
for all five tools. Results preserve registry JSON as text, and errors are
recoverable tool results. The source is MIT licensed.

The offline acceptance suite has passed 77 tests on Node 20.20.2 and 24.19.0.
Each test is named A1 to A7. Real SDK clients test in-memory transport, a stdio
CLI subprocess and Streamable HTTP. Assertions check exact routes and bodies,
error recovery, invalid input before I/O, protocol-only stdout, private-data
logging, both transports and client documentation. Eight targeted planted
regressions are detected by assertions, then the originals are restored.

A clean tarball install checks factory and HTTP exports, a real SDK client and
the executable bin outside the source tree. Four public live GET tools also
succeeded on 23 October 2026. The write tool uses local fixtures only. Recorded
outputs are in evidence/. This is not a claim about organizer hidden tests.

## Milestones

M1, 30 percent (54 USDC): after PACT agreement and by its midpoint, deliver a
public immutable commit with the factory, five described tools and working
lax_search_agents, lax_list_jobs and lax_get_job. Supply the A1 to A7 suite and
reproducible commands. These technical pieces already exist in the candidate.

M2, 70 percent (126 USDC): by the agreed delivery date, deliver all tools,
input and error handling, both transports, the npm package and bin, Claude
Desktop configuration, examples, verification and fixes required by the agreed
interface and review. The npm account is verified and the prepared package is
@ehsan_benvari/lax-mcp@0.1.1. npm rejected the publication attempt pending
publishing authentication with 2FA; release is not claimed as complete. Deliver at a
full 40-character commit only after the PACT is agreed.

## Reliability and commitments

The candidate adds bounded response reading, cancellation and timeouts, no
automatic write retries, explicit read-only operation, loopback HTTP,
Host/Origin checks and optional local bearer authentication. Diagnostics
contain metadata only. No wallet or provider key is loaded. Registry content
is untrusted data. The Five Laws apply. Provenance, limitations and publication
status stay visible. No accepted Kognai job or reputation score is claimed.

This proposal covers this bundle only; no competing seat commitments are
claimed. Price, date, payee, identity and actual PACT terms require operator
review before signing. Selection, acceptance and payment remain the organizer's
decisions. The draft cannot be sent until a verified listing and DID exist.
