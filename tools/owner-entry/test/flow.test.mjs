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
    fetcher: async () => { throw Error('must not send a new request'); }, profileHash, now: () => NOW });
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
