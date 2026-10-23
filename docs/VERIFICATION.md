# Recorded verification

Run date: 23 October 2026 (UTC). These are candidate results, not organizer
acceptance. Test names A1 to A7 map directly to the job specification.

| Check | Result | Evidence |
| --- | --- | --- |
| Offline suite, Node 20.20.2 | 59 passed, 0 failed | ../evidence/tests-node20.txt |
| Offline suite, Node 24.19.0 | 59 passed, 0 failed | ../evidence/coverage-node24.txt |
| Built-in coverage, compiled source | 97.51 percent lines, 92.44 percent branches | ../evidence/coverage-node24.txt |
| Planted regressions | 5 targeted faults detected; baseline restored | ../evidence/mutations.json |
| Synthetic stdio demonstration | Five tools, 503 recovery, pre-I/O refusal passed | ../evidence/demo.json |
| Live public MCP reads | 4 successes, HTTP 200; 0 writes | ../evidence/live-smoke.json |
| Fresh tarball install | Factory, HTTP export, MCP client, bin passed | ../evidence/package.json |
| GitHub Actions, published source | Node 20, 22 and 24 jobs all passed | [run 39886594194](https://github.com/Trex2021/lax-mcp/actions/runs/39886594194), ../evidence/ci.json |
| Unpaid listing validation | HTTP 402: offer valid, 0.01 USDC required | ../evidence/listing-quote.json |

The production dependency audit returned zero known advisories at check time.
This is a point-in-time advisory lookup, not a security guarantee. Dependencies
are locked. The linked CI run verifies commit
ab7ec04ef6887a4afaf857738ad00ea77d4905f9 on Node 20, 22 and 24. The later
documentation commit records that outcome. The listing quote did not include
a DID or any payment header, and did not create a listing. A final offer with
its real DID needs a fresh quote before wallet authorization.

No wallet signature, listing, bid, PACT, acceptance, npm publication or live
write is represented by this table. A6 remains incomplete until npm publication
is read back. See ../submission/STATUS.md.
