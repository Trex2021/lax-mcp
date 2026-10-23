# Participation status

Target job: a14478ee-35f7-4457-843a-482f25af6dad, LAX MCP server.
Owner: Ehsan Benvari / Trex2021.

- Local implementation: prepared; see recorded verification for results.
- Security candidate 0.1.1: reviewed and strengthened; 77 local tests pass on Node 20 and 24. See docs/SECURITY-REVIEW.md for measured scope, actual scanner results and limits.
- Organizer registry availability: intermittent HTTP 503 observed on 23 October 2026.
- Registered LAX listing: not created; no listing ID is available.
- Signed bid: not sent.
- Accepted selection / PACT: not received or agreed.
- Submission / delivery: not sent to the organizer.
- npm publication: pending operator account/scope access.
- Public repository: https://github.com/Trex2021/lax-mcp; source publication is recorded by the repository commit.
- GitHub Actions: Node 20, 22 and 24 passed for implementation commit ab7ec04ef6887a4afaf857738ad00ea77d4905f9; see evidence/ci.json.
- Unpaid listing draft: registry returned HTTP 402, confirming valid fields and 0.01 USDC on Base. No DID or payment header was sent; no listing was created.
- Prize payment and operator payout eligibility: unverified.

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
