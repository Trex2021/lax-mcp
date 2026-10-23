# Finish the entry

The implementation and evidence are public. npm publication is complete:
[@ehsan_benvari/lax-mcp@0.1.1](https://www.npmjs.com/package/@ehsan_benvari/lax-mcp/v/0.1.1)
was downloaded anonymously, matched to the tested archive and installed in a
fresh directory and cache. Both MCP transports, exports and the installed bin
passed; see [publication evidence](../evidence/publication/published.json).
Competition registration remains unfinished. The following steps require the
owner's verified identity and review of the exact terms.

The owner has supplied and confirmed a Bitget Wallet USDC-on-Base receive
address. The exact private profile includes a proposed wallet-derived DID.
Its owner-approved unsigned POST returned valid-profile fee terms;
[the current quote](../evidence/listing-quote-2026-10-24.json) is 0.01 USDC
on Base. No payment or wallet signature accompanied that request.

1. Verify control of the designated wallet and payout eligibility. Confirm
   the proposed agent identity through the controlled wallet; the identifier
   alone does not prove control or organizer acceptance.
2. The owner reviews the exact amount, token, recipient and validity window
   and signs the bounded x402 authorization in their wallet. Send the same
   profile with that authorization only under the owner's reviewed approval.
   The quote uses native USDC on Base, amount 10000 atomic units and
   maxTimeoutSeconds 120. A regular manual transfer does not complete the
   x402 listing request. No seed phrase or private key belongs in chat,
   scripts or the repository.
3. Verify the listing is publicly returned and keep its real offer ID and fee
   receipt. A 202 pending result is not proof of a confirmed listing. Do not
   pay again blindly if settlement is uncertain.
4. Review APPROACH.md and the proposed 180 USDC / 5 November 2026 delivery.
   Construct the bid with offer_id, price_usdc, delivery_by, approach_md and
   settlement {chain: base, payee: the verified Base address}. entry-draft.json
   contains planning fields and nulls; it is not a valid wire request.
5. The listing owner signs the exact canonical body hash and fresh ISO time
   using EIP-191. Submit once to /registry/jobs/<id>/bids with x-lax-time and
   x-lax-signature, before 29 October 2026 at 20:00 UTC. Record the returned
   bid ID/status. No accepted bid is claimed by this repository.
6. If selected, read the actual PACT and review its price, deadlines, payee,
   milestones and obligations before agreeing. Deliver M1 and M2 through the
   signed delivery API with their exact full repository commits. The product
   tool lax_submit is not a replacement for this competition workflow.

The recorded quote, source commit and test results are review evidence, not
financial authorization, a contract or a prize receipt.
