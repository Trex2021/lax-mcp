# Participation status

Target job: a14478ee-35f7-4457-843a-482f25af6dad, LAX MCP server.
Owner: Ehsan Benvari / Trex2021.

- Local implementation: prepared; see recorded verification for results.
- Security candidate 0.1.1: reviewed and strengthened; 77 local tests pass on Node 20 and 24. See docs/SECURITY-REVIEW.md for measured scope, actual scanner results and limits.
- Security implementation merged: 5effbceeac280610adf00e35ef5f5cb277c3d3a5. Main CI passed all 77 tests, demo, local pressure and package checks on Linux Node 20/22/24, Windows 24 and macOS 24. Main CodeQL passed with zero results in the inspected SARIF. See evidence/security/ci.json and evidence/security/codeql.json.
- Organizer registry availability: intermittent HTTP 503 observed on 23 October 2026.
- Registered LAX listing: not created; no listing ID is available.
- Signed bid: not sent.
- Accepted selection / PACT: not received or agreed.
- Submission / delivery: not sent to the organizer.
- npm account: web login completed; npm whoami verified ehsan_benvari. The controlled package target is @ehsan_benvari/lax-mcp@0.1.1.
- npm publication: attempted from the verified 19-file release archive, but npm returned E403 requiring publishing authentication with 2FA. Anonymous version readback returned 404. Publication and registry installation are not complete; see evidence/publication/attempt.json.
- Public repository: https://github.com/Trex2021/lax-mcp; source publication is recorded by the repository commit.
- Earlier 0.1.0 CI: Node 20, 22 and 24 passed for implementation commit ab7ec04ef6887a4afaf857738ad00ea77d4905f9; evidence/ci.json is historical.
- Unpaid listing draft: registry returned HTTP 402, confirming valid fields and 0.01 USDC on Base. No DID or payment header was sent; no listing was created.
- Prize payment and operator payout eligibility: unverified.
- Current release preparation: 08ad9613472a5b7422c105ff4ceb521aaa48f03a merged the verified npm scope and installation guidance. Local checks passed 77 tests, 8 planted regressions, 200 loopback requests and clean tarball installation. Main CI and CodeQL completed successfully; see evidence/publication/ci.json. Production TypeScript and locked dependency versions are unchanged. See OWNER-HANDOFF.md for the remaining owner actions.
- Offer-quote POST: automatic approval review blocked a fresh draft POST; only read-only price/schema checks were completed. The later npm login confirmation does not authorize that separate listing request.

Entry requires an operator-controlled Base wallet, the agent's actual DID,
a current exact fee quote and a wallet signature. The review repository URL
passed draft validation as the listing endpoint. Do not invent
these, reuse a Solana address as a Base address, ask for a recovery phrase, or
place credentials in the project. Agree the organizer's PACT before treating
the candidate as contracted work. The owner must approve the exact contractual
and financial terms.

The currently documented listing price is 0.01 USDC on Base. This is a stated
registration price, not proof of payout or a final all-in cost. Do not execute
any payment from this repository.
