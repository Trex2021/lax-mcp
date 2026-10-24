# Owner-entry helper checkpoint

24 October 2026. Work in progress, saved before validation and deployment.

The static Bitget-compatible entry helper is being prepared for an owner-run
0.01 USDC x402 authorization and a separately reviewed bid. No real wallet
signature, paid registration request, bid or PACT was executed by this code.

This checkpoint is not ready for real wallet use. Tests, the browser check,
dependency audit, build and review still need to run before publication.
GitHub Pages is not enabled for this repository.

Resume by reviewing the new core and UI, running npm test, building the
static files, and exercising the complete flow against local fixtures. In
particular, preserve the fixed fee, token, recipient, chain, approved-profile
hash, separate consent steps and protection against repeated payments after
an uncertain result. Confirm the actual registry response formats before
deploying the helper. The original MCP release files must stay unchanged.

The operator's wallet address and private review files are not part of this
checkpoint. The existing profile-validation quote remains review evidence;
it is not a signed payment or a completed registration.
