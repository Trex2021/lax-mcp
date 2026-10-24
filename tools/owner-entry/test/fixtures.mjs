import { Wallet, getBytes } from 'ethers';
import { readFile } from 'node:fs/promises';
import { EntryClient, LIMITS, digest, profileFor, canonical, verifyBidSignature } from '../src/core.mjs';
export const NOW = Date.parse('2026-10-24T08:00:00Z');
export const template = JSON.parse(await readFile(new URL('../../../submission/offer-draft.json', import.meta.url), 'utf8'));
export const approach = await readFile(new URL('../proposal.md', import.meta.url), 'utf8');
export const wallet = Wallet.createRandom();
const candidate = { ...template, agent_did: 'did:pkh:eip155:8453:' + wallet.address };
export const profileHash = await digest(candidate);
export const profile = await profileFor(wallet.address, template, profileHash);
export function quote() { return { x402Version: 2, resource: { url: LIMITS.registry + '/offers' }, accepts: [{
  scheme: 'exact', network: 'eip155:8453', amount: '10000', asset: LIMITS.asset,
  payTo: LIMITS.recipient, maxTimeoutSeconds: 120, extra: { name: 'USD Coin', version: '2' },
}] }; }
export function job() { return { job: { id: LIMITS.jobId, status: 'open', chain: 'base', bounty_usdc: 200,
  bid_closes: '2026-10-29T20:00:00Z', deadline: '2026-11-09T23:59:00Z' } }; }
export function memoryStorage() {
  const values = new Map(); return { values, getItem: k => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
}
export class FakeProvider {
  constructor() { this.address = wallet.address; this.chain = LIMITS.chainHex; this.calls = []; this.balance = 1000000n; }
  async request({ method, params }) {
    this.calls.push({ method, params });
    if (this.hook) await this.hook(method, params);
    if (this.reject === method) throw { code: 4001 };
    if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [this.address];
    if (method === 'eth_chainId') return this.chain;
    if (method === 'wallet_switchEthereumChain') { this.chain = params[0].chainId; return null; }
    if (method === 'eth_call') return '0x' + this.balance.toString(16);
    if (method === 'eth_signTypedData_v4') {
      const t = JSON.parse(params[1]); const { EIP712Domain, ...types } = t.types;
      return wallet.signTypedData(t.domain, types, t.message);
    }
    if (method === 'personal_sign') return wallet.signMessage(getBytes(params[0]));
    throw new Error('Unexpected provider method: ' + method);
  }
}
export function harness(options = {}) {
  const provider = options.provider ?? new FakeProvider(), storage = options.storage ?? memoryStorage();
  const calls = []; let paid = 0, bids = 0;
  const fetcher = async (url, init) => {
    calls.push({ url, init });
    if (init.credentials !== 'omit' || init.redirect !== 'error' || !url.startsWith(LIMITS.registry + '/')) throw Error('Unsafe fetch');
    const path = new URL(url).pathname.slice('/registry'.length);
    let body, status = 200, headers = {};
    if (path === '/jobs/' + LIMITS.jobId) body = options.job?.() ?? job();
    else if (path === '/offers' && !new Headers(init.headers).has('payment-signature')) {
      body = options.quote?.() ?? quote(); status = 402;
      headers['payment-required'] = Buffer.from(JSON.stringify(options.headerQuote?.() ?? body)).toString('base64');
    } else if (path === '/offers') {
      paid++;
      if (options.paymentError) throw new Error('fixture network failure');
      if (options.paymentStatus === 202) { body = { id: 'fixture-offer' }; status = 202; }
      else body = { ok: true, id: 'fixture-offer', transaction: '0x' + '1'.repeat(64) };
    } else if (path === '/offers/fixture-offer') body = { offer: { ...profile, id: 'fixture-offer' } };
    else if (path === '/jobs/' + LIMITS.jobId + '/bids') {
      bids++;
      const b = JSON.parse(init.body), hs = new Headers(init.headers);
      const message = 'LAX bid POST /jobs/' + LIMITS.jobId + '/bids at ' + hs.get('x-lax-time') + ' body sha256 ' + await digest(b);
      verifyBidSignature(message, hs.get('x-lax-signature'), wallet.address);
      if (options.bidError) throw Error('fixture bid network failure');
      body = { ok: true, bid: { id: 'fixture-bid', status: 'received' } };
    } else throw new Error('Unexpected API route: ' + path);
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
  };
  const client = new EntryClient({ provider, storage, fetcher, template, approach, profileHash, now: () => NOW });
  return { client, provider, storage, calls, get paid() { return paid; }, get bids() { return bids; } };
}
