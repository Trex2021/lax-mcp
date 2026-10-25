# Recorded verification

Current candidate: 0.1.1, reviewed 23 October 2026. These are candidate results,
not organizer acceptance. Test names A1 to A7 map to the job specification.

Release verification on 24 October 2026 (Asia/Tehran) verified the npm account
ehsan_benvari and published @ehsan_benvari/lax-mcp@0.1.1. The new scope passed
the same 77 local tests, eight planted regressions, local pressure and clean
tarball install. [Main CI and CodeQL](../evidence/publication/ci.json) passed for
08ad9613472a5b7422c105ff4ceb521aaa48f03a. Production TypeScript and locked
dependency versions did not change. The first attempt returned E403 requiring
publishing authentication with 2FA; [attempt evidence](../evidence/publication/attempt.json)
preserves that earlier refusal. After the owner confirmed npm's publication
challenge, publication succeeded. Anonymous registry readback and tarball
download verified the exact tested bytes. Installation by exact package name
and version in a fresh directory, with an empty cache and user configuration,
passed the factory, HTTP export, both real SDK transports and installed bin.
[Publication evidence](../evidence/publication/published.json) records those
results. Original audit hashes identify the earlier scope;
[release hashes](../evidence/publication/source-inventory.json) identify the
published candidate.

| Current check | Result | Evidence |
| --- | --- | --- |
| Offline Node 20.20.2 | 77 passed, 0 failed | [log](../evidence/security/tests-node20.txt) |
| Offline Node 24.19.0 | 77 passed, 0 failed | [coverage](../evidence/security/coverage-node24.txt) |
| Built-in coverage, compiled source | 97.29 percent lines, 92.27 percent branches, 100 percent functions | [coverage](../evidence/security/coverage-node24.txt) |
| Planted regressions | 8 detected, originals restored | [record](../evidence/mutations.json) |
| Loopback overload | 200 requests, concurrency bounded, recovery passed | [record](../evidence/security/local-pressure.json) |
| Security review | Fixes, analysis scope and limits | [review](SECURITY-REVIEW.md) |
| Clean package | Current version and integrity in record | [record](../evidence/package.json) |
| Published npm release | Anonymous reads, exact archive match, fresh public-registry install, both MCP transports, exports and installed bin passed | [record](../evidence/publication/published.json), [npm](https://www.npmjs.com/package/@ehsan_benvari/lax-mcp/v/0.1.1) |
| Synthetic stdio demonstration | Five tools, recovery and pre-I/O refusal passed | [record](../evidence/demo.json) |
| Live public reads | 4 successes, HTTP 200, 0 writes | [record](../evidence/live-smoke.json) |
| Earlier unsigned listing validation | HTTP 402: draft without DID valid, 0.01 USDC required | [historical record](../evidence/listing-quote.json) |
| Owner-approved profile quote, 24 October 2026 | HTTP 402: checksum-corrected profile with proposed DID valid; 0.01 USDC on Base; no payment or wallet signature | [record](../evidence/listing-quote-2026-10-24.json) |
| GitHub CI, reviewed implementation | 77 tests, demo, pressure and package checks passed in all five environments; eight mutations detected on Linux 24 | [record](../evidence/security/ci.json), [run](https://github.com/Trex2021/lax-mcp/actions/runs/40014019642) |
| CodeQL, reviewed implementation | security-and-quality completed; inspected SARIF has 0 results and all production files extracted | [record](../evidence/security/codeql.json), [run](https://github.com/Trex2021/lax-mcp/actions/runs/40014019651) |
| Release CI and CodeQL, main | CI passed in all five environments; CodeQL completed successfully for the published source commit | [record](../evidence/publication/ci.json), [CI](https://github.com/Trex2021/lax-mcp/actions/runs/40028272655), [CodeQL](https://github.com/Trex2021/lax-mcp/actions/runs/40028272694) |

The security-review main-branch runs verified implementation merge
5effbceeac280610adf00e35ef5f5cb277c3d3a5. The matrix covered Linux Node 20,
22 and 24, Windows Node 24 and macOS Node 24. The release runs verified
08ad9613472a5b7422c105ff4ceb521aaa48f03a. The candidate's A6 implementation,
publication and registry-installation checks are complete.

The production and dev dependency audit returned zero known advisories at check time.
This is a point-in-time advisory lookup, not a security guarantee. Dependencies
are locked. The earlier quote omitted a DID. The owner later supplied and
confirmed a Base receive address and approved the exact profile containing
its proposed wallet-derived DID. The new unsigned POST returned valid-profile
fee terms; its PAYMENT-REQUIRED header agrees with the response. The native
USDC contract matches Circle's published Base address. Wallet control still
requires the owner's signature. Neither quote created a listing or included
a payment header.

The owner-approved profile was transmitted for validation. No wallet
signature, listing, bid, PACT, organizer acceptance or payment is represented
by this table. See [entry status](../submission/STATUS.md).

## Historical 0.1.0 CI

[Run 39886594194](https://github.com/Trex2021/lax-mcp/actions/runs/39886594194)
passed 59 tests on Node 20, 22 and 24 for commit
ab7ec04ef6887a4afaf857738ad00ea77d4905f9. [Its record](../evidence/ci.json)
is historical and does not establish the 0.1.1 outcome.

## Owner-entry helper, 25 October 2026

The mobile signing helper is separate from the released MCP package. Its
27 offline core and flow tests and eight intercepted Chromium scenarios
passed. Browser checks found and corrected a browser-only unbound-fetch
failure before publication. They cover separate fee/bid consent, real
cryptographic signatures from an in-memory test wallet, cancellation,
changed fees, unavailable storage, receipt download and recovery after a
lost response and reload. Production's profile pin and output remain intact.
No browser test reaches the real registry or the operator's wallet.

The local clean-install check reproduced the exact 19-file npm archive;
its SHA-1 is still `2b62af5afb1a9dc005bb96beccbbf95841b56c2f`.
Dependency audit reported zero known advisories at check time. A fresh,
checksum-verified Gitleaks 8.30.1 scan of the public working snapshot found
no leaks. Local Semgrep could not complete with the restored runtime; the
dedicated workflow runs it in a clean isolated environment. CI outcomes
must be checked against the actual helper commit, separately from earlier
MCP security evidence.

See [helper checks](../evidence/owner-entry/checks.json),
[browser results](../evidence/owner-entry/browser.json),
[package regression](../evidence/owner-entry/package-regression.json) and
[source and phone instructions](../tools/owner-entry/README.md).
GitHub Pages deployment and a real Android Bitget flow remain unverified.
No actual payment, listing, bid or PACT is represented by these checks.
