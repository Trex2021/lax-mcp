import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { verifyTypedData } from 'ethers';
import { LIMITS, digest } from '../src/core.mjs';
import { harness, profileHash, wallet, NOW, quote } from './fixtures.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const out = path.join(here, '../test-artifacts');
await mkdir(out, { recursive: true });
const html = await readFile(path.join(root, 'docs/entry/index.html'));
const css = await readFile(path.join(root, 'docs/entry/style.css'));
const production = await readFile(path.join(root, 'docs/entry/app.js'), 'utf8');
assert.ok(production.includes(LIMITS.profileHash));
for (const forbidden of [profileHash, wallet.address, wallet.privateKey]) assert.equal(production.includes(forbidden), false);

// Only this in-memory fixture build admits the randomly generated test wallet.
// No fixture key is bundled. Production output is read-only throughout this test.
const fixture = await build({
  absWorkingDir: path.resolve(here, '..'), entryPoints: ['src/app.mjs'],
  write: false, bundle: true, format: 'esm', platform: 'browser', target: ['es2022'],
  plugins: [{ name: 'offline-wallet-fixture', setup(builder) {
    builder.onLoad({ filter: /[/\\]src[/\\]core\.mjs$/ }, async args => {
      const source = await readFile(args.path, 'utf8');
      assert.equal(source.split(LIMITS.profileHash).length, 2);
      return { contents: source.replace(LIMITS.profileHash, profileHash), loader: 'js' };
    });
  } }],
});
const files = new Map([
  ['/', ['text/html', html]], ['/style.css', ['text/css', css]],
  ['/app.js', ['text/javascript', fixture.outputFiles[0].contents]],
  ['/production/', ['text/html', html]], ['/production/style.css', ['text/css', css]],
  ['/production/app.js', ['text/javascript', production]],
  ['/framed/', ['text/html', '<!doctype html><iframe src="/" title="Fixture frame"></iframe>']],
]);
const server = createServer((req, res) => {
  const file = files.get(req.url);
  if (!file) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': file[0], 'Cache-Control': 'no-store' }); res.end(file[1]);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
let browser;
const results = [];
try {
  browser = await chromium.launch({ headless: true,
    ...(process.env.LAX_BROWSER_EXECUTABLE ? { executablePath: process.env.LAX_BROWSER_EXECUTABLE } : {}),
    args: ['--disable-dev-shm-usage'],
  });
  async function scenario(name, options, run, width = 390) {
    const h = harness(options);
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true,
      deviceScaleFactor: 1, serviceWorkers: 'block', acceptDownloads: true });
    const errors = [], escaped = [];
    context.on('page', page => page.on('pageerror', e => errors.push(e.message)));
    await context.exposeFunction('fixtureWalletRequest', args => h.provider.request(args));
    await context.addInitScript(({ now, noProvider, blockedStorage }) => {
      Date.now = () => now;
      window.fixtureCspViolations = [];
      document.addEventListener('securitypolicyviolation', e => window.fixtureCspViolations.push(e.violatedDirective));
      if (!noProvider) {
        const listeners = new Map();
        window.bitkeep = { ethereum: { request: args => window.fixtureWalletRequest(args),
          on: (event, fn) => { listeners.set(event, fn); } } };
        window.fixtureWalletEvent = event => listeners.get(event)?.();
      }
      if (blockedStorage) Storage.prototype.setItem = () => { throw Error('Fixture storage unavailable'); };
    }, { now: NOW, noProvider: !!options.noProvider, blockedStorage: !!options.blockedStorage });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === origin) { await route.continue(); return; }
      if (url.origin !== 'https://lax.kognai.ai') { escaped.push(url.origin); await route.abort(); return; }
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
        'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-expose-headers': 'PAYMENT-REQUIRED' };
      if (request.method() === 'OPTIONS') { await route.fulfill({ status: 200, headers: cors, body: '' }); return; }
      try {
        const response = await h.client.fetcher(request.url(), { method: request.method(), body: request.postData() ?? undefined,
          headers: request.headers(), credentials: 'omit', redirect: 'error' });
        await route.fulfill({ status: response.status, headers: { ...Object.fromEntries(response.headers), ...cors }, body: await response.text() });
      } catch { await route.abort('failed'); }
    });
    const page = await context.newPage();
    try {
      await page.goto(origin + (options.production ? '/production/' : '/'));
      await page.waitForFunction(() => document.querySelector('#approach').textContent.length > 100);
      await run({ page, context, h });
      const metrics = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
        csp: window.fixtureCspViolations }));
      assert.ok(metrics.width <= metrics.viewport, 'No horizontal overflow at ' + width + ' px');
      assert.deepEqual(metrics.csp, []); assert.deepEqual(errors, []); assert.deepEqual(escaped, []);
      results.push({ name, viewportWidth: width, passed: true, fixturePayments: h.paid, fixtureBids: h.bids });
    } catch (error) {
      await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
      console.error(JSON.stringify({ scenario: name, status: await page.locator('#status').textContent(),
        errors, escaped, rpcMethods: h.provider.calls.map(c => c.method),
        apiCalls: h.calls.map(c => ({ url: c.url, method: c.init.method })),
        csp: await page.evaluate(() => window.fixtureCspViolations) }));
      throw error;
    } finally { await context.close(); }
  }
  const connected = async page => {
    await page.locator('#connect').click();
    await page.waitForFunction(() => !document.querySelector('#fee-consent').disabled);
  };
  const fee = async page => { await page.locator('#fee-consent').check(); await page.locator('#register').click(); };
  await scenario('No provider: Bitget link, disabled financial controls, mobile layout', { noProvider: true }, async ({ page, h }) => {
    assert.ok(await page.locator('#open-wallet').isVisible());
    const link = new URL(await page.locator('#bitget-link').getAttribute('href'));
    assert.equal(link.origin, 'https://bkcode.vip'); assert.equal(link.searchParams.get('url'), origin + '/');
    assert.ok(await page.locator('#register').isDisabled()); assert.equal(h.paid, 0);
    await page.screenshot({ path: path.join(out, 'mobile-open-wallet.png'), fullPage: true });
  }, 360);
  await scenario('Production bundle rejects every account except the pinned approved profile', { production: true }, async ({ page, h }) => {
    await page.locator('#connect').click(); await page.waitForFunction(() => document.querySelector('#status').classList.contains('error'));
    assert.ok(await page.locator('#register').isDisabled()); assert.equal(h.calls.length, 0);
    assert.equal(h.provider.calls.some(c => c.method.includes('sign')), false);
  });
  await scenario('An embedded signing page cannot connect or request a signature', {}, async ({ page, h }) => {
    await page.goto(origin + '/framed/');
    const frame = page.frameLocator('iframe');
    await frame.locator('#status.error').waitFor();
    assert.ok(await frame.locator('#connect').isDisabled());
    assert.ok(await frame.locator('#register').isDisabled()); assert.ok(await frame.locator('#bid').isDisabled());
    assert.equal(h.provider.calls.length, 0); assert.equal(h.calls.length, 0);
  });
  await scenario('Separate fee and bid consent, real fixture signatures, receipt download and reload', {}, async ({ page, h }) => {
    await connected(page); assert.equal(h.paid, 0);
    assert.equal(h.provider.calls.some(c => c.method.includes('sign')), false);
    assert.ok(await page.locator('#register').isDisabled());
    assert.equal(await page.locator('#account').textContent(), wallet.address);
    await page.screenshot({ path: path.join(out, 'mobile-connected.png'), fullPage: true });
    await fee(page); await page.waitForFunction(() => !document.querySelector('#bid-consent').disabled);
    assert.equal(h.paid, 1); assert.equal(h.bids, 0); assert.ok(await page.locator('#bid').isDisabled());
    const paid = h.calls.find(c => new Headers(c.init.headers).has('payment-signature'));
    const packet = JSON.parse(atob(new Headers(paid.init.headers).get('payment-signature')));
    const typed = JSON.parse(h.provider.calls.find(c => c.method === 'eth_signTypedData_v4').params[1]);
    const { EIP712Domain, ...types } = typed.types;
    assert.equal(verifyTypedData(typed.domain, types, packet.payload.authorization, packet.payload.signature), wallet.address);
    assert.equal(packet.payload.authorization.value, '10000'); assert.equal(packet.payload.authorization.to, LIMITS.recipient);
    assert.equal(await digest(JSON.parse(paid.init.body)), profileHash);
    const preview = JSON.parse(await page.locator('#bid-body').textContent());
    assert.equal(preview.price_usdc, 180); assert.equal(preview.settlement.payee, wallet.address);
    await page.locator('#bid-consent').check(); await page.locator('#bid').click();
    await page.waitForFunction(() => document.querySelector('#receipt-status').textContent.includes('دریافت پیشنهاد'));
    assert.equal(h.bids, 1);
    const downloading = page.waitForEvent('download'); await page.locator('#download').click();
    const download = await downloading, receiptPath = path.join(out, 'fixture-receipt.json'); await download.saveAs(receiptPath);
    const raw = await readFile(receiptPath, 'utf8'), receipt = JSON.parse(raw);
    assert.equal(receipt.stage, 'bid_submitted'); assert.equal(receipt.bidId, 'fixture-bid');
    assert.equal(/signature|payment-signature|privateKey|mnemonic/i.test(raw), false);
    await page.reload(); await page.locator('#connect').click();
    await page.waitForFunction(() => !document.querySelector('#receipt-section').hidden);
    assert.ok(await page.locator('#register').isDisabled()); assert.ok(await page.locator('#bid').isDisabled());
    assert.equal(h.paid, 1); assert.equal(h.bids, 1);
    await page.screenshot({ path: path.join(out, 'mobile-receipt.png'), fullPage: true });
  });
  await scenario('Wallet cancellation sends no paid request', {}, async ({ page, h }) => {
    h.provider.reject = 'eth_signTypedData_v4'; await connected(page); await fee(page);
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('لغو'));
    assert.equal(h.paid, 0); assert.equal(await page.evaluate(() => localStorage.length), 0);
  });
  await scenario('Changed fee terms stop before signing', { quote: () => { const q = quote(); q.accepts[0].amount = '20000'; return q; } }, async ({ page, h }) => {
    await page.locator('#connect').click(); await page.waitForFunction(() => document.querySelector('#status').classList.contains('error'));
    assert.ok(await page.locator('#register').isDisabled()); assert.equal(h.paid, 0);
    assert.equal(h.provider.calls.some(c => c.method.includes('sign')), false);
  });
  await scenario('Blocked receipt storage stops before signing', { blockedStorage: true }, async ({ page, h }) => {
    await connected(page); await fee(page);
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('ذخیرهٔ رسید'));
    assert.equal(h.paid, 0); assert.equal(h.provider.calls.some(c => c.method.includes('sign')), false);
  });
  await scenario('Lost payment reply stays locked after reload; explicit GET readback recovers it', { paymentError: true }, async ({ page, h }) => {
    await connected(page); await fee(page);
    await page.waitForFunction(() => document.querySelector('#status').classList.contains('error'));
    assert.equal(h.paid, 1); assert.ok(await page.locator('#register').isDisabled());
    await page.reload(); await page.locator('#connect').click();
    await page.waitForFunction(() => !document.querySelector('#receipt-section').hidden);
    assert.ok(await page.locator('#register').isDisabled());
    const before = h.calls.length; await page.locator('#check').click();
    await page.waitForFunction(() => !document.querySelector('#bid-consent').disabled);
    assert.ok(h.calls.slice(before).every(c => c.init.method === 'GET')); assert.equal(h.paid, 1);
  });
  const summary = { browser: browser.version(), scenarios: results.length, passed: results,
    realRegistryRequests: 0, realWalletSignatures: 0, productionBundleUnchanged: true };
  assert.equal(await readFile(path.join(root, 'docs/entry/app.js'), 'utf8'), production);
  await writeFile(path.join(out, 'browser-results.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser?.close(); await new Promise(resolve => server.close(resolve));
}
