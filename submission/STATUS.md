# Participation status

Target job: a14478ee-35f7-4457-843a-482f25af6dad, LAX MCP server.
Owner: Ehsan Benvari / Trex2021.

- Local implementation: prepared; see recorded verification for results.
- Security candidate 0.1.1: reviewed and strengthened; 77 local tests pass on Node 20 and 24. See docs/SECURITY-REVIEW.md for measured scope, actual scanner results and limits.
- Security implementation merged: 5effbceeac280610adf00e35ef5f5cb277c3d3a5. Main CI passed all 77 tests, demo, local pressure and package checks on Linux Node 20/22/24, Windows 24 and macOS 24. Main CodeQL passed with zero results in the inspected SARIF. See evidence/security/ci.json and evidence/security/codeql.json.
- Organizer registry availability: intermittent HTTP 503 observed on 23 October 2026.
- Registered LAX listing: not created; no listing ID is available.
- Signed bid: not sent.
- Owner-entry page: prepared under docs/entry with separate offline wallet-flow tests. GitHub Pages deployment and actual Bitget owner signatures remain pending; see tools/owner-entry/README.md and evidence/owner-entry/checks.json. No helper fixture is a real listing or bid.
- Accepted selection / PACT: not received or agreed.
- Submission / delivery: not sent to the organizer.
- npm account: web login completed; npm whoami verified ehsan_benvari. The controlled package target is @ehsan_benvari/lax-mcp@0.1.1.
- npm publication: @ehsan_benvari/lax-mcp@0.1.1 is public at https://www.npmjs.com/package/@ehsan_benvari/lax-mcp/v/0.1.1. Anonymous metadata and tarball reads succeeded. The downloaded archive exactly matches the verified 19-file release archive. A fresh public-registry installation passed factory, HTTP export, both MCP transports and installed-bin checks; see evidence/publication/published.json. The earlier E403 refusal remains historical in evidence/publication/attempt.json.
- Public repository: https://github.com/Trex2021/lax-mcp; source publication is recorded by the repository commit.
- Earlier 0.1.0 CI: Node 20, 22 and 24 passed for implementation commit ab7ec04ef6887a4afaf857738ad00ea77d4905f9; evidence/ci.json is historical.
- Earlier unpaid listing draft: HTTP 402 confirmed valid fields and 0.01 USDC on Base without a DID. Its historical record is evidence/listing-quote.json.
- Current owner-approved profile: on 24 October 2026 (Asia/Tehran), one unsigned POST containing the proposed wallet-derived DID returned HTTP 402 and valid-profile fee terms: 0.01 USDC on Base. The header and response agree. No payment header, wallet signature or listing was produced; see evidence/listing-quote-2026-10-24.json.
- Operator wallet: the owner supplied a Bitget Wallet mobile address and confirmed copying it from USDC Receive on Base. The address and proposed DID remain in the private review draft. Wallet control has not been verified by signature.
- Prize payment and operator payout eligibility: unverified.
- Current release preparation: 08ad9613472a5b7422c105ff4ceb521aaa48f03a merged the verified npm scope and installation guidance. Local checks passed 77 tests, 8 planted regressions, 200 loopback requests and clean tarball installation. Main CI and CodeQL completed successfully; see evidence/publication/ci.json. Production TypeScript and locked dependency versions are unchanged. See OWNER-HANDOFF.md for the remaining owner actions.
- Earlier offer-quote POST approval block: resolved by the owner's explicit approval of the exact checksum-corrected profile. That approval covered unsigned validation and the fee quote only; payment, signed bid and PACT approval remain separate.

The operator has supplied a Base receive address and approved the profile
validation request. Entry still requires wallet-control proof, the agent's
verified DID and the owner's bounded x402 authorization. The review repository URL
passed draft validation as the listing endpoint. Do not invent
these, reuse a Solana address as a Base address, ask for a recovery phrase, or
place credentials in the project. Agree the organizer's PACT before treating
the candidate as contracted work. The owner must approve the exact contractual
and financial terms.

The currently documented listing price is 0.01 USDC on Base. This is a stated
registration price, not proof of payout or a final all-in cost. Do not execute
any payment from this repository.
