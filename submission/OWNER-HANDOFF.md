# Owner handoff

The 0.1.1 implementation is on main. CI and CodeQL for commit
08ad9613472a5b7422c105ff4ceb521aaa48f03a completed successfully:
[CI](https://github.com/Trex2021/lax-mcp/actions/runs/40028272655),
[CodeQL](https://github.com/Trex2021/lax-mcp/actions/runs/40028272694).
The exact tested archive is now published as
[@ehsan_benvari/lax-mcp@0.1.1](https://www.npmjs.com/package/@ehsan_benvari/lax-mcp/v/0.1.1).
Anonymous metadata and tarball reads verified its integrity and exact bytes.
A fresh installation from the public registry passed factory, HTTP export,
stdio, Streamable HTTP and installed-bin checks. The
[publication evidence](../evidence/publication/published.json) records those
checks. npm publication and registry verification are complete.

## Proposed entry terms

| Field | Proposed value |
| --- | --- |
| Job | LAX MCP server, a14478ee-35f7-4457-843a-482f25af6dad |
| Bid | 180 USDC, below the 200 USDC ceiling |
| Delivery | 5 November 2026, 20:00 UTC |
| Bid closes | 29 October 2026, 20:00 UTC |
| Settlement | USDC on Base; operator supplied the payee privately, wallet-control proof pending |
| M1 / M2 | 54 / 126 USDC, conditional on milestone acceptance |

These are draft bid terms. There is no accepted bid or PACT. The organizer's
current rules and the selected agent's actual PACT control acceptance and pay.

## Required owner input

1. The owner has supplied a Bitget Wallet mobile address and confirmed it is
   the USDC Receive address on Base. A proposed did:pkh identifier was derived
   from that account with its original EIP-55 checksum case. The exact profile
   is retained privately; the public offer-draft.json is a redacted template.
   Wallet control still needs proof through the owner's signature. No agent
   listing or organizer identity approval is claimed.
2. The owner explicitly approved the checksum-corrected profile for unsigned
   validation. LAX returned HTTP 402 with valid-profile fee terms: 0.01 USDC,
   exact scheme, Base (eip155:8453), native USDC contract
   0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, recipient
   0xF62fb064F9d9D03B8013E5b6023e3501805BA973, maxTimeoutSeconds 120.
   [Quote evidence](../evidence/listing-quote-2026-10-24.json) records the
   response and checks. The owner must review the exact amount, recipient,
   token, chain and validity window before signing the bounded x402
   authorization in their wallet. A regular manual transfer is not a
   substitute for the authorization attached to the same profile POST.

Only after the listing exists can its owner sign and send the exact bid.
Actual selection, PACT agreement and milestone delivery follow separately.
No payment, bid, contract acceptance or live submission has occurred.

Current checks and remaining gates: [entry readiness](../evidence/entry-readiness.json).
Detailed procedure: [next steps](NEXT-STEPS.md).

## Mobile signing helper

An owner-run page is prepared in `docs/entry/`, with source, protocol limits
and phone instructions in [tools/owner-entry](../tools/owner-entry/README.md).
The helper's fixture checks are separate from the published MCP checks.
Enable GitHub Pages from `main` and `/docs`, verify the live page, then open
`https://trex2021.github.io/lax-mcp/entry/` in Bitget's DApp browser. The URL is
usable only after deployment. This page replaces manual signature construction;
the owner still reviews and signs each exact fee and bid in the wallet.

No helper fixture is a real registration. No listing ID, bid ID, wallet
control proof or payment is claimed until the live owner-run result is
verified. Keep receipts private until their intended contents are reviewed.
