import { getAddress, verifyMessage, verifyTypedData, hexlify, toUtf8Bytes } from 'ethers';

export const LIMITS = Object.freeze({
  registry: 'https://lax.kognai.ai/registry',
  jobId: 'a14478ee-35f7-4457-843a-482f25af6dad',
  chainId: 8453,
  chainHex: '0x2105',
  asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  recipient: '0xF62fb064F9d9D03B8013E5b6023e3501805BA973',
  amount: '10000',
  profileHash: '19a694ea56200cc84361f907a1d1106dc1128d4bd6822f4edf28ecee17c46f92',
  price: 180,
  delivery: '2026-11-05T20:00:00Z',
});
const TYPES = { TransferWithAuthorization: [
  { name: 'from', type: 'address' }, { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' }, { name: 'validAfter', type: 'uint256' },
  { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' },
] };
const DOMAIN = Object.freeze({ name: 'USD Coin', version: '2', chainId: 8453, verifyingContract: LIMITS.asset });
const MAX_BYTES = 262144;
export class EntryError extends Error {
  constructor(code) { super(code); this.code = code; }
}
const fail = code => { throw new EntryError(code); };
export function canonical(v, depth = 0) {
  if (depth > 32) fail('INVALID_JSON');
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
  if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(x => canonical(x, depth + 1)).join(',') + ']';
  if (typeof v !== 'object' || Object.getPrototypeOf(v) !== Object.prototype) fail('INVALID_JSON');
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k], depth + 1)).join(',') + '}';
}
export async function digest(v) {
  const bytes = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(v)));
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('');
}
export async function profileFor(account, template, expected = LIMITS.profileHash) {
  let address;
  try { address = getAddress(account); } catch { fail('WRONG_WALLET'); }
  const profile = JSON.parse(JSON.stringify(template));
  profile.agent_did = 'did:pkh:eip155:8453:' + address;
  if (await digest(profile) !== expected) fail('WRONG_WALLET');
  if (new TextEncoder().encode(canonical(profile)).length > 16384) fail('INVALID_PROFILE');
  return profile;
}
export function validateQuote(body) {
  const q = body?.accepts?.[0];
  if (body?.x402Version !== 2 || body.resource?.url !== LIMITS.registry + '/offers' ||
      !Array.isArray(body.accepts) || body.accepts.length !== 1 || !q ||
      q.scheme !== 'exact' || q.network !== 'eip155:8453' || q.amount !== LIMITS.amount ||
      q.asset !== LIMITS.asset || q.payTo !== LIMITS.recipient || q.maxTimeoutSeconds !== 120 ||
      q.extra?.name !== 'USD Coin' || q.extra?.version !== '2' ||
      Object.keys(q).some(k => !['scheme', 'network', 'amount', 'asset', 'payTo', 'maxTimeoutSeconds', 'extra'].includes(k)) ||
      (q.extra.assetTransferMethod !== undefined && q.extra.assetTransferMethod !== 'eip3009') ||
      Object.keys(q.extra).some(k => !['name', 'version', 'assetTransferMethod'].includes(k))) fail('QUOTE_CHANGED');
  return JSON.parse(JSON.stringify(q));
}
export function checkJob(body, now) {
  const j = body?.job;
  if (!j || j.id !== LIMITS.jobId || j.status !== 'open' || j.chain !== 'base' ||
      !Number.isFinite(Number(j.bounty_usdc)) || Number(j.bounty_usdc) < LIMITS.price ||
      !Number.isFinite(Date.parse(j.bid_closes)) || Date.parse(j.bid_closes) <= now ||
      Date.parse(LIMITS.delivery) <= now ||
      !Number.isFinite(Date.parse(j.deadline)) || Date.parse(j.deadline) < Date.parse(LIMITS.delivery)) fail('JOB_NOT_OPEN');
  return j;
}
export function authorizationFor(account, now, nonce) {
  if (!Number.isSafeInteger(now) || now < 1 || !/^0x[0-9a-f]{64}$/.test(nonce)) fail('INVALID_AUTHORIZATION');
  return { from: getAddress(account), to: LIMITS.recipient, value: LIMITS.amount,
    validAfter: String(now - 10), validBefore: String(now + 110), nonce };
}
export function typedFor(authorization) {
  return { domain: { ...DOMAIN }, primaryType: 'TransferWithAuthorization', types: {
    EIP712Domain: [{ name: 'name', type: 'string' }, { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' }, { name: 'verifyingContract', type: 'address' }],
    TransferWithAuthorization: TYPES.TransferWithAuthorization.map(x => ({ ...x })),
  }, message: { ...authorization } };
}
export function paymentPayload(authorization, signature, quote, account) {
  const typed = typedFor(authorization);
  if (authorization.from !== getAddress(account) || authorization.to !== LIMITS.recipient ||
      authorization.value !== LIMITS.amount || Number(authorization.validBefore) - Number(authorization.validAfter) !== 120 ||
      !/^0x[0-9a-f]{64}$/.test(authorization.nonce)) fail('INVALID_AUTHORIZATION');
  if (typeof signature !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(signature)) fail('INVALID_SIGNATURE');
  let signer;
  try { signer = verifyTypedData(typed.domain, TYPES, typed.message, signature); } catch { fail('INVALID_SIGNATURE'); }
  if (getAddress(signer) !== getAddress(account)) fail('INVALID_SIGNATURE');
  return { x402Version: 2, resource: { url: LIMITS.registry + '/offers', mimeType: 'application/json' },
    accepted: validateQuote({ x402Version: 2, resource: { url: LIMITS.registry + '/offers' }, accepts: [quote] }),
    payload: { signature, authorization: { ...authorization } } };
}
export function bidFor(offerId, address, approach) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(offerId) || typeof approach !== 'string' ||
      approach.length < 100 || new TextEncoder().encode(approach).length > 11000) fail('INVALID_BID');
  return { offer_id: offerId, price_usdc: LIMITS.price, delivery_by: LIMITS.delivery,
    approach_md: approach, settlement: { chain: 'base', payee: getAddress(address) } };
}
export async function bidMessage(body, time) {
  if (!Number.isFinite(Date.parse(time))) fail('INVALID_BID');
  return 'LAX bid POST /jobs/' + LIMITS.jobId + '/bids at ' + time + ' body sha256 ' + await digest(body);
}
export function verifyBidSignature(message, signature, address) {
  if (typeof signature !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(signature)) fail('INVALID_SIGNATURE');
  let signer;
  try { signer = verifyMessage(message, signature); } catch { fail('INVALID_SIGNATURE'); }
  if (getAddress(signer) !== getAddress(address)) fail('INVALID_SIGNATURE');
}
function nonce32() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return '0x' + [...bytes].map(x => x.toString(16).padStart(2, '0')).join('');
}
function safeId(v) { return typeof v === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(v) ? v : null; }
function safeTx(v) { return typeof v === 'string' && /^0x[0-9a-fA-F]{64}$/.test(v) ? v : null; }
async function responseJson(response) {
  const reader = response.body?.getReader();
  if (!reader) fail('INVALID_RESPONSE');
  const chunks = []; let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength; if (length > MAX_BYTES) fail('INVALID_RESPONSE'); chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { fail('INVALID_RESPONSE'); }
}

export class EntryClient {
  constructor({ provider, template, approach, storage, fetcher = globalThis.fetch, now = () => Date.now(),
    profileHash = LIMITS.profileHash }) {
    this.provider = provider; this.template = JSON.parse(JSON.stringify(template)); this.approach = approach;
    this.storage = storage; this.fetcher = fetcher; this.now = now; this.profileHash = profileHash;
    this.storageKey = 'lax-owner-entry-' + profileHash; this.account = null; this.profile = null;
    this.busy = false; this.receipt = null;
  }
  invalidate() { this.account = null; this.profile = null; this.quote = null; }
  async exclusive(fn) {
    if (this.busy) fail('BUSY'); this.busy = true;
    try { return await fn(); } finally { this.busy = false; }
  }
  async rpc(method, params = []) {
    try { return await this.provider.request({ method, params }); }
    catch (e) { fail(e?.code === 4001 ? 'USER_CANCELLED' : 'WALLET_ERROR'); }
  }
  save(next) {
    const receipt = { version: 1, profileHash: this.profileHash, ...next };
    try {
      const value = JSON.stringify(receipt); this.storage.setItem(this.storageKey, value);
      if (this.storage.getItem(this.storageKey) !== value) fail('STORAGE_REQUIRED');
    } catch { fail('STORAGE_REQUIRED'); }
    this.receipt = receipt; return receipt;
  }
  async request(path, { method = 'GET', body, headers = {} } = {}) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await this.fetcher(LIMITS.registry + path, { method, body: body === undefined ? undefined : JSON.stringify(body),
        headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
        credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer', signal: controller.signal });
      return { status: response.status, body: await responseJson(response), headers: response.headers };
    } catch (e) { if (e instanceof EntryError) throw e; fail('NETWORK_ERROR'); }
    finally { clearTimeout(timer); }
  }
  async assertWallet() {
    if (!this.account || !this.profile) fail('CONNECT_FIRST');
    const accounts = await this.rpc('eth_accounts');
    if (!Array.isArray(accounts) || !accounts[0] || getAddress(accounts[0]) !== this.account ||
        String(await this.rpc('eth_chainId')).toLowerCase() !== LIMITS.chainHex) fail('WALLET_CHANGED');
  }
  async connect() { return this.exclusive(async () => {
    if (!this.provider?.request) fail('OPEN_BITGET');
    const accounts = await this.rpc('eth_requestAccounts');
    if (!Array.isArray(accounts) || !accounts[0]) fail('WRONG_WALLET');
    const account = getAddress(accounts[0]); const profile = await profileFor(account, this.template, this.profileHash);
    if (String(await this.rpc('eth_chainId')).toLowerCase() !== LIMITS.chainHex) {
      await this.rpc('wallet_switchEthereumChain', [{ chainId: LIMITS.chainHex }]);
    }
    this.account = account; this.profile = profile; await this.assertWallet();
    try {
      const saved = this.storage.getItem(this.storageKey);
      if (saved) {
        const value = JSON.parse(saved);
        if (value.version !== 1 || value.profileHash !== this.profileHash || value.account !== account ||
            !['payment_pending', 'registered', 'bid_pending', 'bid_submitted'].includes(value.stage)) fail('INVALID_RECEIPT');
        if (value.stage === 'payment_pending' && value.sent === false) this.storage.removeItem(this.storageKey);
        else this.receipt = value;
      }
    } catch { fail('INVALID_RECEIPT'); }
    if (!this.receipt) await this.refreshQuote(); return { account, receipt: this.receipt };
  }); }
  async refreshQuote() {
    await this.assertWallet();
    checkJob((await this.request('/jobs/' + LIMITS.jobId)).body, this.now());
    const response = await this.request('/offers', { method: 'POST', body: this.profile });
    if (response.status !== 402) fail('QUOTE_CHANGED');
    const quote = validateQuote(response.body);
    const header = response.headers.get('payment-required');
    if (!header || header.length > 65536) fail('INVALID_RESPONSE');
    let decoded;
    try { decoded = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(header), c => c.charCodeAt(0)))); }
    catch { fail('INVALID_RESPONSE'); }
    if (canonical(validateQuote(decoded)) !== canonical(quote)) fail('QUOTE_CHANGED');
    this.quote = quote; return quote;
  }
  async register() { return this.exclusive(async () => {
    if (this.receipt) fail('CHECK_RECEIPT');
    await this.refreshQuote(); await this.assertWallet();
    const data = '0x70a08231' + this.account.slice(2).toLowerCase().padStart(64, '0');
    let balance;
    try { balance = BigInt(await this.rpc('eth_call', [{ to: LIMITS.asset, data }, 'latest'])); }
    catch (e) { if (e instanceof EntryError) throw e; fail('WALLET_ERROR'); }
    if (balance < 10000n) fail('BALANCE_TOO_LOW');
    const account = this.account; const auth = authorizationFor(account, Math.floor(this.now() / 1000), nonce32());
    this.save({ stage: 'payment_pending', account, nonce: auth.nonce, validBefore: auth.validBefore, sent: false });
    let payload;
    try {
      const signature = await this.rpc('eth_signTypedData_v4', [account, JSON.stringify(typedFor(auth))]);
      await this.assertWallet();
      if (this.now() / 1000 >= Number(auth.validBefore) - 5) fail('AUTHORIZATION_EXPIRED');
      payload = paymentPayload(auth, signature, this.quote, account);
    } catch (e) {
      this.storage.removeItem(this.storageKey); this.receipt = null; throw e;
    }
    this.save({ ...this.receipt, sent: true });
    const encoded = btoa(JSON.stringify(payload));
    const result = await this.request('/offers', { method: 'POST', body: this.profile, headers: { 'PAYMENT-SIGNATURE': encoded } });
    const offerId = safeId(result.body?.id ?? result.body?.offer?.id);
    const tx = safeTx(result.body?.transaction);
    this.save({ ...this.receipt, httpStatus: result.status, ...(offerId ? { offerId } : {}), ...(tx ? { paymentTx: tx } : {}) });
    if (result.status !== 200 || result.body?.ok !== true || !offerId) fail('PAYMENT_PENDING');
    await this.verifyListing(); return this.receipt;
  }); }
  async verifyListing() {
    await this.assertWallet();
    const id = this.receipt?.offerId; if (!safeId(id)) fail('PAYMENT_PENDING');
    const response = await this.request('/offers/' + encodeURIComponent(id));
    const offer = response.body?.offer ?? response.body;
    if (response.status !== 200 || offer?.agent_did !== this.profile.agent_did ||
        offer?.name !== this.profile.name || offer?.endpoint !== this.profile.endpoint ||
        (offer.id !== undefined && offer.id !== id)) fail('PAYMENT_PENDING');
    this.save({ ...this.receipt, stage: this.receipt.stage === 'payment_pending' ? 'registered' : this.receipt.stage, offerId: id });
    return this.receipt;
  }
  async checkListing() { return this.exclusive(() => this.verifyListing()); }
  async sendBid() { return this.exclusive(async () => {
    if (this.receipt?.stage !== 'registered') fail('REGISTER_FIRST');
    await this.verifyListing();
    checkJob((await this.request('/jobs/' + LIMITS.jobId)).body, this.now());
    await this.assertWallet();
    const account = this.account, body = bidFor(this.receipt.offerId, account, this.approach);
    const time = new Date(this.now()).toISOString(), message = await bidMessage(body, time);
    const signature = await this.rpc('personal_sign', [hexlify(toUtf8Bytes(message)), account]);
    await this.assertWallet(); verifyBidSignature(message, signature, account);
    if (this.now() - Date.parse(time) >= 240000) fail('AUTHORIZATION_EXPIRED');
    this.save({ ...this.receipt, stage: 'bid_pending', bidBodySha256: await digest(body), bidTime: time });
    const result = await this.request('/jobs/' + LIMITS.jobId + '/bids', { method: 'POST', body,
      headers: { 'x-lax-time': time, 'x-lax-signature': signature } });
    const id = safeId(result.body?.bid?.id ?? result.body?.id ?? result.body?.bid_id);
    this.save({ ...this.receipt, bidHttpStatus: result.status, ...(id ? { bidId: id } : {}) });
    if (![200, 201].includes(result.status) || !id || result.body?.ok === false) fail('BID_PENDING');
    this.save({ ...this.receipt, stage: 'bid_submitted' }); return this.receipt;
  }); }
}
