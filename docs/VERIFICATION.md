# Recorded verification

Current candidate: 0.1.1, reviewed 23 October 2026. These are candidate results,
not organizer acceptance. Test names A1 to A7 map to the job specification.

| Current check | Result | Evidence |
| --- | --- | --- |
| Offline Node 20.20.2 | 77 passed, 0 failed | [log](../evidence/security/tests-node20.txt) |
| Offline Node 24.19.0 | 77 passed, 0 failed | [coverage](../evidence/security/coverage-node24.txt) |
| Built-in coverage, compiled source | 97.29 percent lines, 92.27 percent branches, 100 percent functions | [coverage](../evidence/security/coverage-node24.txt) |
| Planted regressions | 8 detected, originals restored | [record](../evidence/mutations.json) |
| Loopback overload | 200 requests, concurrency bounded, recovery passed | [record](../evidence/security/local-pressure.json) |
| Security review | Fixes, analysis scope and limits | [review](SECURITY-REVIEW.md) |
| Clean package | Current version and integrity in record | [record](../evidence/package.json) |
| Synthetic stdio demonstration | Five tools, recovery and pre-I/O refusal passed | [record](../evidence/demo.json) |
| Live public reads | 4 successes, HTTP 200, 0 writes | [record](../evidence/live-smoke.json) |
| Unpaid listing validation | HTTP 402: offer valid, 0.01 USDC required | [record](../evidence/listing-quote.json) |
| GitHub CI, main | 77 tests, demo, pressure and package checks passed in all five environments; eight mutations detected on Linux 24 | [record](../evidence/security/ci.json), [run](https://github.com/Trex2021/lax-mcp/actions/runs/40014019642) |
| CodeQL, main | security-and-quality completed; inspected SARIF has 0 results and all production files extracted | [record](../evidence/security/codeql.json), [run](https://github.com/Trex2021/lax-mcp/actions/runs/40014019651) |

The current main-branch runs verified implementation merge
5effbceeac280610adf00e35ef5f5cb277c3d3a5. The matrix covered Linux Node 20,
22 and 24, Windows Node 24 and macOS Node 24. A6 still requires npm publication
and readback.

The production and dev dependency audit returned zero known advisories at check time.
This is a point-in-time advisory lookup, not a security guarantee. Dependencies
are locked. The listing quote did not include
a DID or any payment header, and did not create a listing. A final offer with
its real DID needs a fresh quote before wallet authorization.

No wallet signature, listing, bid, PACT, acceptance, npm publication or live
write is represented by this table. A6 remains incomplete until npm publication
is read back. See [entry status](../submission/STATUS.md).

## Historical 0.1.0 CI

[Run 39886594194](https://github.com/Trex2021/lax-mcp/actions/runs/39886594194)
passed 59 tests on Node 20, 22 and 24 for commit
ab7ec04ef6887a4afaf857738ad00ea77d4905f9. [Its record](../evidence/ci.json)
is historical and does not establish the 0.1.1 outcome.
