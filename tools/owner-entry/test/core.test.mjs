import test from 'node:test';
import assert from 'node:assert/strict';
import { Wallet, TypedDataEncoder } from 'ethers';
import { LIMITS, canonical, digest, profileFor, validateQuote, checkJob, authorizationFor,
  typedFor, paymentPayload, bidFor, bidMessage, verifyBidSignature } from '../src/core.mjs';
import { NOW, wallet, template, profileHash, quote, job, approach } from './fixtures.mjs';

test('Production payment cap, chain and approved-profile digest are fixed', () => {
  assert.equal(LIMITS.amount, '10000'); assert.equal(LIMITS.chainId, 8453);
  assert.equal(LIMITS.profileHash, '19a694ea56200cc84361f907a1d1106dc1128d4bd6822f4edf28ecee17c46f92');
  assert.ok(Object.isFrozen(LIMITS));
});
test('Canonical JSON sorts every object, preserves array order and rejects non-JSON/deep input', async () => {
  assert.equal(canonical({ z: [2, { z: 1, a: 3 }], a: 'x' }), '{"a":"x","z":[2,{"a":3,"z":1}]}');
  assert.equal(await digest({ b: 1, a: 2 }), await digest({ a: 2, b: 1 }));
  assert.throws(() => canonical({ value: undefined }));
  let v = {}; for (let i = 0; i < 34; i++) v = { next: v };
  assert.throws(() => canonical(v));
});
test('Profile preserves EIP-55 and rejects other accounts or altered content', async () => {
  const profile = await profileFor(wallet.address.toLowerCase(), template, profileHash);
  assert.equal(profile.agent_did, 'did:pkh:eip155:8453:' + wallet.address);
  await assert.rejects(profileFor(Wallet.createRandom().address, template, profileHash));
  await assert.rejects(profileFor(wallet.address, { ...template, description: 'changed' }, profileHash));
});
test('Fee gate refuses changed amount, recipient, token, chain, scheme, timeout or signing domain', () => {
  for (const [key, value] of Object.entries({ amount: '10001', payTo: wallet.address, asset: wallet.address,
    network: 'eip155:1', scheme: 'upto', maxTimeoutSeconds: 3600, extra: { name: 'Other', version: '2' } })) {
    const q = quote(); q.accepts[0][key] = value; assert.throws(() => validateQuote(q), key);
  }
  for (const extra of [{ name: 'USD Coin', version: '2', assetTransferMethod: 'permit2' },
    { name: 'USD Coin', version: '2', spender: wallet.address }]) {
    const q = quote(); q.accepts[0].extra = extra; assert.throws(() => validateQuote(q));
  }
  const q = quote(); q.resource.url += '?other'; assert.throws(() => validateQuote(q));
  assert.equal(validateQuote(quote()).amount, '10000');
});
test('Closed bids, low ceilings, different chains and past delivery stop entry', () => {
  for (const change of [{ status: 'closed' }, { chain: 'solana' }, { bounty_usdc: 179 }, { bid_closes: new Date(NOW).toISOString() }, { deadline: '2026-11-01T00:00:00Z' }]) {
    const j = job(); Object.assign(j.job, change); assert.throws(() => checkJob(j, NOW));
  }
  const j = job(); j.job.bid_closes = '2027-01-01T00:00:00Z'; j.job.deadline = '2027-02-01T00:00:00Z';
  assert.throws(() => checkJob(j, Date.parse('2026-11-06T00:00:00Z')));
});
test('EIP-3009 signature binds exactly one amount, recipient, Base contract and 120-second interval', async () => {
  const auth = authorizationFor(wallet.address, NOW / 1000, '0x' + 'a'.repeat(64));
  const typed = typedFor(auth), { EIP712Domain, ...types } = typed.types;
  assert.equal(TypedDataEncoder.from(types).primaryType, 'TransferWithAuthorization');
  assert.equal(Number(auth.validBefore) - Number(auth.validAfter), 120);
  const signature = await wallet.signTypedData(typed.domain, types, typed.message);
  const payload = paymentPayload(auth, signature, validateQuote(quote()), wallet.address);
  assert.equal(payload.payload.authorization.value, '10000');
  assert.throws(() => paymentPayload({ ...auth, value: '1000000' }, signature, validateQuote(quote()), wallet.address));
  assert.throws(() => paymentPayload({ ...auth, to: Wallet.createRandom().address }, signature, validateQuote(quote()), wallet.address));
  const wrongSignature = await Wallet.createRandom().signTypedData(typed.domain, types, typed.message);
  assert.throws(() => paymentPayload(auth, wrongSignature, validateQuote(quote()), wallet.address));
});
test('Bid body and EIP-191 message bind the exact offer, price, date, payee and proposal', async () => {
  const body = bidFor('fixture-offer', wallet.address, approach), time = new Date(NOW).toISOString();
  assert.equal(body.price_usdc, 180); assert.equal(body.delivery_by, '2026-11-05T20:00:00Z');
  const message = await bidMessage(body, time), signature = await wallet.signMessage(message);
  verifyBidSignature(message, signature, wallet.address);
  await assert.rejects(async () => verifyBidSignature(await bidMessage({ ...body, price_usdc: 1 }, time), signature, wallet.address));
  assert.throws(() => bidFor('../other', wallet.address, approach));
});
