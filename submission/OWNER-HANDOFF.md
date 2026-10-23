# Owner handoff

The 0.1.1 implementation is on main. CI and CodeQL for commit
08ad9613472a5b7422c105ff4ceb521aaa48f03a completed successfully:
[CI](https://github.com/Trex2021/lax-mcp/actions/runs/40028272655),
[CodeQL](https://github.com/Trex2021/lax-mcp/actions/runs/40028272694).
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

1. npm login is verified as ehsan_benvari and the package scope was changed to
   @ehsan_benvari/lax-mcp. The tested 0.1.1 archive was submitted for publication,
   but npm returned E403 requiring publishing authentication with 2FA. Complete
   the account's 2FA requirement through npm itself; do not share a password,
   OTP, token or recovery code in the repository or chat. Publication must then
   succeed and be read back and installed from the registry before A6 is closed.
   [Attempt evidence](../evidence/publication/attempt.json) records the actual
   refusal and anonymous 404 readback, not a successful npm release.
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
