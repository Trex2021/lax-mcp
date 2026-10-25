# Owner-run LAX entry

This static helper lets the operator review and sign the LAX listing fee
and a separate project bid in Bitget Wallet's mobile DApp browser. It does
not load a key, run a backend, or accept a PACT. Opening the page does not
connect the wallet or perform a registry request.

The generated page is in `docs/entry/`. GitHub Pages must be enabled before
`https://trex2021.github.io/lax-mcp/entry/` is usable. Preparation and fixture
tests do not establish a real listing, wallet compatibility or an accepted bid.
See [the verification record](../../evidence/owner-entry/checks.json).

## Deployment and phone steps

1. After merging the verified source, open the repository's Settings > Pages.
   Set Source to `Deploy from a branch`, branch `main`, folder `/docs`, then
   Save. Wait for GitHub's Pages deployment to complete and the entry URL to
   return the expected page over HTTPS.
2. Open the entry URL in Bitget Wallet's DApp browser. The page also offers
   Bitget's official Android deep link. Use the already designated Base account.
3. Connect and read the full public profile, fee recipient and USDC contract.
   Connection checks the current job and sends the profile without a payment
   header to obtain a fresh fee quote. No signature is requested at this step.
4. Review the fee checkbox and wallet prompt. The only payment authorization
   is **0.01 native USDC on Base**, token
   `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, to
   `0xF62fb064F9d9D03B8013E5b6023e3501805BA973`. The EIP-3009 authorization
   has a random nonce and a 120-second interval, beginning 10 seconds before
   its creation. The wallet prompt has about 105 seconds before the helper
   refuses to send it. A usual Send transfer is not this registration.
5. Wait for the listing's full profile to be read back from LAX. Then review
   the full English proposal and exact bid body: **180 USDC**, delivery
   **5 November 2026 at 20:00 UTC**, same Base payout account. The price is
   proposed compensation for the work, not another payment from this wallet.
   Check the separate consent box and sign the EIP-191 bid message in Bitget.
6. Save the receipt and return its listing ID, bid ID and fee transaction to
   the project conversation. Listing and bid receipt do not mean selection.
   Selection, actual PACT review and milestone delivery remain separate.

If a paid request loses its reply, do not clear browser data or pay from
another device. The saved receipt blocks another attempt. `Check listing`
uses GET requests, including a search for the exact profile if no ID arrived.
An uncertain bid is kept pending for review, never silently retried. Local
storage and Web Locks are required before any signature; the helper stops if
they are unavailable. Storage cannot prevent duplicates across different
devices or after the operator manually deletes it.

## Scope and privacy

- The approved profile's canonical SHA-256 is pinned. The page derives a
  checksum-cased `did:pkh:eip155:8453` from the connected account and refuses
  any other profile. The operator's full address is not in public source.
  A matching hash is not proof of wallet control or organizer approval.
- Current fee body and `PAYMENT-REQUIRED` header must agree on the fixed
  network, token, amount, recipient, scheme, domain and timeout. Changed or
  unsupported terms stop the flow before signing. This helper supports only
  the EIP-3009 transfer method and a recoverable EOA signature.
- The account, Base chain, bid window and signature recovery are checked
  before sending. The native USDC balance is checked through the wallet.
- There is no token approval or direct transaction RPC. Payment and bid each
  need their own visible owner action. A Web Lock and reloaded receipt guard
  concurrent pages. The result is saved before each signed HTTP write.
- Signatures and payment headers exist only in memory and the direct HTTPS
  request to LAX. They are absent from logs, local storage and the download.
  The local receipt contains the connected public account, IDs and state.
  The profile and DID become public on the organizer's registry when listed.
- A strict CSP limits network calls to LAX. Scripts, styles and five bundled
  dependency licences are served locally; no runtime CDN or analytics.
- The original MCP npm package does not import or ship this helper. Its
  published 19-file archive is unchanged.

## Development

From this directory, using Node 24:

```sh
npm ci --ignore-scripts
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

For an existing compatible Chromium, set `LAX_BROWSER_EXECUTABLE` to its
absolute executable path instead of downloading Playwright's browser. CI uses
the Chrome already installed on the Ubuntu runner. Browser tests intercept
all LAX traffic and sign with a randomly generated in-memory test wallet. A
separate temporary bundle admits that fixture; production's pinned digest
and output remain unchanged. Tests send zero requests to the real registry.
Screenshots and fixture receipts remain ignored under `test-artifacts/`.

The eight browser scenarios cover mobile layout, rejection by the actual
production bundle, separate consent and signatures, cancellation, changed
fees, unavailable storage, rejection inside an iframe, and recovery after a lost reply and page reload.
They are not a live Android Bitget test or independent penetration test.

## Protocol references

- [LAX API and bid-signing instructions](https://lax.kognai.ai/)
- [Kognessium rules](https://www.kognai.ai/docs/hackathon)
- [x402 exact EVM scheme](https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_evm.md)
- [EIP-3009](https://eips.ethereum.org/EIPS/eip-3009)
- [Bitget EVM provider](https://web3.bitget.com/en/docs/connect/mainnet/evm)
- [Bitget deep links](https://web3.bitget.com/en/docs/configuration/deeplink)
- [GitHub Pages source configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
