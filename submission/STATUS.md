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
- npm publication: pending operator account/scope access.
- Public repository: https://github.com/Trex2021/lax-mcp; source publication is recorded by the repository commit.
- Earlier 0.1.0 CI: Node 20, 22 and 24 passed for implementation commit ab7ec04ef6887a4afaf857738ad00ea77d4905f9; evidence/ci.json is historical.
- Unpaid listing draft: registry returned HTTP 402, confirming valid fields and 0.01 USDC on Base. No DID or payment header was sent; no listing was created.
- Prize payment and operator payout eligibility: unverified.
- Follow-up readiness: final evidence commit 1e9231775202920b1b013a75e4579efe463e0d5f also passed CI and CodeQL; a fresh local package install passed. npm web login was initiated but not completed; its unauthenticated session was cancelled pending owner input. See OWNER-HANDOFF.md and evidence/entry-readiness.json. Automatic approval review blocked a fresh offer-quote POST; only read-only price/schema checks were completed.

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
