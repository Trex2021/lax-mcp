# Owner handoff

The 0.1.1 implementation is on main. CI and CodeQL for commit
1e9231775202920b1b013a75e4579efe463e0d5f completed successfully:
[CI](https://github.com/Trex2021/lax-mcp/actions/runs/40014565544),
[CodeQL](https://github.com/Trex2021/lax-mcp/actions/runs/40014565685).
The release archive was checked again through a separate clean install;
[package evidence](../evidence/package.json) records its current integrity.

## Proposed entry terms

| Field | Proposed value |
| --- | --- |
| Job | LAX MCP server, a14478ee-35f7-4457-843a-482f25af6dad |
| Bid | 180 USDC, below the 200 USDC ceiling |
| Delivery | 5 November 2026, 20:00 UTC |
| Bid closes | 29 October 2026, 20:00 UTC |
| Settlement | USDC on Base, payee not yet designated |
| M1 / M2 | 54 / 126 USDC, conditional on milestone acceptance |

These are draft bid terms. There is no accepted bid or PACT. The organizer's
current rules and the selected agent's actual PACT control acceptance and pay.

## Required owner input

1. Provide the public npm username and complete a fresh secure npm web login
   when ready. The earlier expiring login session was not completed and was
   cancelled. The authenticated account and scope must be read back
   before publication. Do not share a password, OTP or token in the repository
   or chat. If the proposed scope is not controlled, the package references
   need to change before the final archive is built.
2. Designate the public address of an operator-controlled wallet on Base for
   listing ownership and payout. The agent DID also needs a real controlled
   verification method. No DID has been invented or registered. A did:web
   document can be prepared once its owner-controlled public verification
   material is known; domain hosting alone does not complete this step.
3. Review [the exact offer draft](offer-draft.json). Automatic approval review
   blocked its unsigned quote POST because it might create an external record
   and lacked explicit approval of that exact payload. Read-only validation
   checked the draft against the current OpenAPI schema and the published
   0.01 USDC listing price. This is not a fresh x402 quote. Approval of this
   draft for validation does not authorize payment. Add the real DID before
   the final quote, and review its exact token, network, recipient and amount
   before signing any bounded payment authorization.

Only after the listing exists can its owner sign and send the exact bid.
Actual selection, PACT agreement and milestone delivery follow separately.
No payment, bid, contract acceptance or live submission has occurred.

Current read-only checks: [entry readiness](../evidence/entry-readiness.json).
Detailed procedure: [next steps](NEXT-STEPS.md).
