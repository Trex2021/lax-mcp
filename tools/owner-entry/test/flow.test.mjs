import test from 'node:test';
import assert from 'node:assert/strict';
import { Wallet, verifyTypedData } from 'ethers';
import { LIMITS, EntryClient } from '../src/core.mjs';
import { harness, quote, job, profile, profileHash, template, approach, wallet, NOW } from './fixtures.mjs';
const rejects = (p, code) => assert.rejects(p, e => e.code === code);

test('Connection and quote make no payment or signature request', async () => {
  const h = harness(); await h.client.connect();
  assert.equal(h.paid, 0); assert.equal(h.bids, 0);
  assert.equal(h.provider.calls.filter(x => x.method.includes('sign')).length, 0);
});
test('Successful owner flow validates actual crypto signatures, then sends a separate bid', async () => {
  const h = harness(); await h.client.connect(); await h.client.register();
  assert.equal(h.paid, 1); assert.equal(h.bids, 0); assert.equal(h.client.receipt.stage, 'registered');
  const paid = h.calls.find(x => new Headers(x.init.headers).has('payment-signature'));
  const payload = JSON.parse(atob(new Headers(paid.init.headers).get('payment-signature')));
  const typed = JSON.parse(h.provider.calls.find(x => x.method === 'eth_signTypedData_v4').params[1]);
  const { EIP712Domain, ...types } = typed.types;
  assert.equal(verifyTypedData(typed.domain, types, typed.message, payload.payload.signature), wallet.address);
  await h.client.sendBid(); assert.equal(h.bids, 1); assert.equal(h.client.receipt.stage, 'bid_submitted');
  assert.equal(h.client.receipt.bidId, 'fixture-bid');
  assert.equal(h.provider.calls.filter(x => ['eth_sendTransaction', 'eth_sign', 'wallet_addEthereumChain'].includes(x.method)).length, 0);
  assert.equal(JSON.stringify(h.client.receipt).includes('signature'), false);
  await rejects(h.client.register(), 'CHECK_RECEIPT'); assert.equal(h.paid, 1);
});
test('Wallet cancellation sends no authorization and allows a fresh explicit retry', async () => {
  const h = harness(); await h.client.connect(); h.provider.reject = 'eth_signTypedData_v4';
  await rejects(h.client.register(), 'USER_CANCELLED'); assert.equal(h.paid, 0); assert.equal(h.client.receipt, null);
});
test('Insufficient Base USDC stops before signing', async () => {
  const h = harness(); await h.client.connect(); h.provider.balance = 9999n;
  await rejects(h.client.register(), 'BALANCE_TOO_LOW');
  assert.equal(h.provider.calls.filter(x => x.method === 'eth_signTypedData_v4').length, 0); assert.equal(h.paid, 0);
});
test('Mismatch between payment header and body stops before signing', async () => {
  const h = harness({ headerQuote: () => { const q = quote(); q.accepts[0].amount = '20000'; return q; } });
  await rejects(h.client.connect(), 'QUOTE_CHANGED'); assert.equal(h.paid, 0);
});
test('Changed or closed job prevents even the unsigned quote', async () => {
  const h = harness({ job: () => { const j = job(); j.job.status = 'closed'; return j; } });
  await rejects(h.client.connect(), 'JOB_NOT_OPEN'); assert.equal(h.calls.length, 1);
});
test('Unwritable receipt storage stops before the wallet signature', async () => {
  const h = harness(); await h.client.connect(); h.storage.setItem = () => { throw Error('blocked'); };
  await rejects(h.client.register(), 'STORAGE_REQUIRED'); assert.equal(h.paid, 0);
  assert.equal(h.provider.calls.filter(x => x.method === 'eth_signTypedData_v4').length, 0);
});
test('Account changes during signing prevent the paid POST', async () => {
  const h = harness(); await h.client.connect();
  h.provider.hook = method => { if (method === 'eth_signTypedData_v4') h.provider.address = Wallet.createRandom().address; };
  await rejects(h.client.register(), 'WALLET_CHANGED'); assert.equal(h.paid, 0);
});
test('A completed payment request with a lost reply is locked across page reloads', async () => {
  const h = harness({ paymentError: true }); await h.client.connect();
  await rejects(h.client.register(), 'NETWORK_ERROR'); assert.equal(h.paid, 1);
  const reloaded = new EntryClient({ provider: h.provider, template, approach, storage: h.storage,
    locks: h.client.locks, fetcher: async () => { throw Error('must not send a new request'); }, profileHash, now: () => NOW });
  await reloaded.connect(); await rejects(reloaded.register(), 'CHECK_RECEIPT');
  assert.equal(reloaded.receipt.stage, 'payment_pending'); assert.equal(reloaded.receipt.sent, true);
});
test('202 stays pending; explicit public readback can advance it without a new charge', async () => {
  const h = harness({ paymentStatus: 202 }); await h.client.connect();
  await rejects(h.client.register(), 'PAYMENT_PENDING'); assert.equal(h.client.receipt.stage, 'payment_pending');
  await h.client.checkListing(); assert.equal(h.client.receipt.stage, 'registered'); assert.equal(h.paid, 1);
});
test('Pending bid stays pending after checking the listing; no second bid or payment is automatic', async () => {
  const h = harness({ bidError: true }); await h.client.connect(); await h.client.register();
  await rejects(h.client.sendBid(), 'NETWORK_ERROR');
  await h.client.checkListing(); assert.equal(h.client.receipt.stage, 'bid_pending');
  await rejects(h.client.sendBid(), 'REGISTER_FIRST'); assert.equal(h.bids, 1); assert.equal(h.paid, 1);
});
test('Concurrent double clicks cannot create a second payment attempt', async () => {
  const h = harness(); await h.client.connect();
  let release, started; const waiting = new Promise(r => { started = r; });
  h.provider.hook = async method => { if (method === 'eth_signTypedData_v4') { started(); await new Promise(r => { release = r; }); } };
  const first = h.client.register(); await waiting; await rejects(h.client.register(), 'BUSY'); release();
  await first; assert.equal(h.paid, 1);
});

test('A malformed saved receipt invalidates connection and cannot be bypassed by calling register', async () => {
  const h = harness(); h.storage.setItem(h.client.storageKey, '{broken');
  await rejects(h.client.connect(), 'INVALID_RECEIPT');
  assert.equal(h.client.ready, false); assert.equal(h.client.account, null);
  await rejects(h.client.register(), 'CONNECT_FIRST'); assert.equal(h.paid, 0);
  assert.equal(h.provider.calls.some(c => c.method.includes('sign')), false);
});
test('A receipt corrupted after connection is checked again before any signature', async () => {
  const h = harness(); await h.client.connect(); h.storage.setItem(h.client.storageKey, '{}');
  await rejects(h.client.register(), 'INVALID_RECEIPT'); assert.equal(h.paid, 0);
  assert.equal(h.provider.calls.some(c => c.method.includes('sign')), false);
});
test('Two pages sharing storage cannot sign or pay twice, including after the first page finishes', async () => {
  const first = harness(), second = harness({ storage: first.storage, locks: first.client.locks });
  await first.client.connect(); await second.client.connect();
  let release, started; const waiting = new Promise(r => { started = r; });
  first.provider.hook = async method => { if (method === 'eth_signTypedData_v4') { started(); await new Promise(r => { release = r; }); } };
  const paying = first.client.register(); await waiting;
  await rejects(second.client.register(), 'BUSY'); release(); await paying;
  await rejects(second.client.register(), 'CHECK_RECEIPT');
  assert.equal(first.paid + second.paid, 1);
  assert.equal(second.provider.calls.some(c => c.method.includes('sign')), false);
});
test('A browser without cross-page locks stops before a financial signature', async () => {
  const h = harness(); await h.client.connect(); h.client.locks = undefined;
  await rejects(h.client.register(), 'BROWSER_UNSUPPORTED'); assert.equal(h.paid, 0);
  assert.equal(h.provider.calls.some(c => c.method.includes('sign')), false);
});
test('Expired wallet prompts and a bid window closing during a prompt prevent sending', async () => {
  let now = NOW; const h = harness({ now: () => now }); await h.client.connect();
  h.provider.hook = method => { if (method === 'eth_signTypedData_v4') now += 106000; };
  await rejects(h.client.register(), 'AUTHORIZATION_EXPIRED'); assert.equal(h.paid, 0);
  const end = Date.parse('2026-10-29T20:00:00Z'); now = end - 1000;
  const other = harness({ now: () => now }); await other.client.connect(); await other.client.register();
  other.provider.hook = method => { if (method === 'personal_sign') now = end; };
  await rejects(other.client.sendBid(), 'JOB_NOT_OPEN'); assert.equal(other.bids, 0);
});
test('Lost payment reply can recover the matching public listing using GET requests only', async () => {
  const h = harness({ paymentError: true }); await h.client.connect();
  await rejects(h.client.register(), 'NETWORK_ERROR');
  const before = h.calls.length; await h.client.checkListing();
  assert.equal(h.client.receipt.stage, 'registered'); assert.equal(h.client.receipt.offerId, 'fixture-offer');
  assert.ok(h.calls.slice(before).every(c => c.init.method === 'GET')); assert.equal(h.paid, 1);
});
test('Changed listing content and explicitly unlisted rows never enable a bid', async () => {
  for (const change of [{ listed: false }, { capabilities: [] }, { description: 'changed by fixture' }]) {
    const h = harness({ offer: () => ({ offer: { ...profile, id: 'fixture-offer', ...change } }) });
    await h.client.connect(); await rejects(h.client.register(), 'PAYMENT_PENDING');
    assert.equal(h.client.receipt.stage, 'payment_pending');
    await rejects(h.client.sendBid(), 'REGISTER_FIRST'); assert.equal(h.bids, 0);
  }
});
test('A stale second page cannot erase a pending bid by checking its listing', async () => {
  const h = harness({ bidError: true }); await h.client.connect(); await h.client.register();
  const second = harness({ storage: h.storage, locks: h.client.locks }); await second.client.connect();
  await rejects(h.client.sendBid(), 'NETWORK_ERROR');
  await second.client.checkListing(); assert.equal(second.client.receipt.stage, 'bid_pending');
  await rejects(second.client.sendBid(), 'REGISTER_FIRST'); assert.equal(second.bids, 0);
});
