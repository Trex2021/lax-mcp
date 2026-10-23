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

The production dependency audit returned zero known advisories at check time.
This is a point-in-time advisory lookup, not a security guarantee. Dependencies
are locked. CI is configured for Node 20, 22 and 24; local evidence is available
for 20 and 24. Configuration alone does not prove a successful CI run.

No wallet signature, listing, bid, PACT, acceptance, npm publication or live
write is represented by this table. A6 remains incomplete until npm publication
is read back. See ../submission/STATUS.md.
