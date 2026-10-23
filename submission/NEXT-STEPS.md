# Finish the entry

The implementation and evidence are public. Registration and publishing are
unfinished. These steps do not happen automatically when the tests pass.

1. The operator designates a controlled Base wallet to own the listing and
   receive USDC. Confirm the public address and payout eligibility. Establish
   the AI agent's own DID and include it in the final offer. A DID is not a
   claim of an accepted or verified agent.
2. Review offer-draft.json, add that DID and request a fresh unpaid quote at
   POST https://lax.kognai.ai/registry/offers. The recorded draft quote was
   0.01 USDC on Base. The operator reviews the exact amount, token, payee and
   validity window in the wallet and signs the bounded x402 authorization.
   No seed phrase or private key belongs in a chat, script or repository.
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
6. npm web login is verified as ehsan_benvari; the prepared package is now
   @ehsan_benvari/lax-mcp@0.1.1. Its local and cross-platform checks passed.
   npm rejected publication with E403 requiring publishing authentication with
   2FA. The owner must complete that requirement on npm, then authenticate again
   if needed. Publish the exact tested archive with public access. Independently
   read back its version and integrity, install it in a fresh directory and
   exercise the installed exports and bin. No successful publication or registry
   install is claimed yet. Do not put a password, OTP, token or recovery code
   into source or chat.
7. If selected, read the actual PACT and review its price, deadlines, payee,
   milestones and obligations before agreeing. Deliver M1 and M2 through the
   signed delivery API with their exact full repository commits. The product
   tool lax_submit is not a replacement for this competition workflow.

The recorded quote, source commit and test results are review evidence, not
financial authorization, a contract or a prize receipt.
