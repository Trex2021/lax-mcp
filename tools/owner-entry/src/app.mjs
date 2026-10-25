import { EntryClient, LIMITS, bidFor } from './core.mjs';
import { template, approach } from './generated.mjs';
const $ = id => document.getElementById(id);
const provider = window.bitkeep?.ethereum ?? window.ethereum;
let client;
const messages = {
  OPEN_BITGET: 'این صفحه را در مرورگر داخلی Bitget Wallet باز کن.',
  WRONG_WALLET: 'کیف پول انتخاب‌شده با پروفایل تأییدشده مطابقت ندارد. همان حسابی را انتخاب کن که آدرسش را فرستادی.',
  USER_CANCELLED: 'امضا در کیف پول لغو شد؛ درخواست تازه‌ای از این امضا ارسال نشد.',
  WALLET_ERROR: 'کیف پول نتوانست درخواست را انجام دهد. شبکهٔ Base و اتصال اینترنت را بررسی کن.',
  WALLET_CHANGED: 'حساب یا شبکه تغییر کرد. برای بررسی دوباره، اتصال کیف پول را بزن.',
  CONNECT_FIRST: 'ابتدا کیف پول را متصل کن.',
  QUOTE_CHANGED: 'شرایط دریافتی با مبلغ، توکن یا گیرندهٔ تأییدشده مطابقت ندارد. پرداخت متوقف شد.',
  JOB_NOT_OPEN: 'مهلت یا شرایط فعلی پروژه اجازهٔ ادامه با این پیشنهاد را نمی‌دهد.',
  BALANCE_TOO_LOW: 'موجودی USDC اصلی روی Base کمتر از 0.01 USDC است.',
  BROWSER_UNSUPPORTED: 'مرورگر کیف پول امکان قفل هم‌زمانی را ندارد. Bitget Wallet را به‌روزرسانی کن و این صفحه را دوباره در مرورگر داخلی آن باز کن.',
  INVALID_SIGNATURE: 'امضا با حساب و مشخصات مورد انتظار مطابقت ندارد. درخواست ارسال نشد.',
  AUTHORIZATION_EXPIRED: 'زمان امضا تمام شد؛ درخواست امضاشده ارسال نشد.',
  STORAGE_REQUIRED: 'ذخیرهٔ رسید در این مرورگر ممکن نیست. عملیات برای جلوگیری از پرداخت تکراری متوقف شد.',
  CHECK_RECEIPT: 'برای این پروفایل رسید قبلی وجود دارد. ابتدا وضعیت همان رسید را بررسی کن.',
  INVALID_RECEIPT: 'رسید ذخیره‌شده قابل تأیید نیست. بدون پرداخت دوباره، وضعیت را در گفتگو بررسی کنیم.',
  PAYMENT_PENDING: 'فهرست‌شدن هنوز تأیید نشده است. رسید را ذخیره کن؛ پرداخت دوباره متوقف شده است.',
  BID_PENDING: 'نتیجهٔ نهایی پیشنهاد مشخص نیست. رسید را ذخیره کن و دوباره ارسال نکن.',
  REGISTER_FIRST: 'ابتدا باید فهرست‌شدن عامل تأیید شود.',
  NETWORK_ERROR: 'پاسخ کامل شبکه دریافت نشد. اگر رسید در انتظار داری، دوباره پرداخت نکن.',
  INVALID_RESPONSE: 'پاسخ سرویس قابل تأیید نیست. رسید موجود را ذخیره کن و دوباره پرداخت نکن.',
  BUSY: 'درخواست قبلی هنوز در حال انجام است.',
};
function status(text, error = false) { $('status').textContent = text; $('status').classList.toggle('error', error); }
function render() {
  const account = client?.ready ? client.account : null, r = client?.receipt, busy = !!client?.busy;
  $('connect').disabled = busy;
  $('fee-consent').disabled = !account || busy || !!r;
  $('register').disabled = !account || busy || !!r || !$('fee-consent').checked;
  $('bid-consent').disabled = busy || r?.stage !== 'registered' || !account;
  $('bid').disabled = busy || r?.stage !== 'registered' || !account || !$('bid-consent').checked;
  $('wallet-info').hidden = !account; $('account').textContent = account ?? '';
  $('profile').textContent = client?.profile ? JSON.stringify(client.profile, null, 2) : 'پس از اتصال کیف پول نمایش داده می‌شود.';
  $('receipt-section').hidden = !r;
  $('check').disabled = busy || !account || !r || r?.sent !== true || r?.stage === 'bid_submitted';
  $('download').disabled = !r;
  $('payee').textContent = account ?? 'پس از اتصال همان آدرس کیف پول نمایش داده می‌شود.';
  $('bid-body').textContent = account && r?.offerId ? JSON.stringify(bidFor(r.offerId, account, approach), null, 2) : 'پس از ثبت پروفایل و دریافت شناسهٔ آن نمایش داده می‌شود.';
  $('receipt-fields').replaceChildren();
  if (r) {
    $('receipt-status').textContent = ({ payment_pending: 'نتیجهٔ پرداخت هنوز نهایی نیست. دوباره پرداخت نکن.', registered: 'فهرست‌شدن پروفایل از LAX تأیید شد. پیشنهاد پروژه هنوز ارسال نشده است.', bid_pending: 'نتیجهٔ پیشنهاد در انتظار بررسی است. رسید را ذخیره کن.', bid_submitted: 'LAX دریافت پیشنهاد را اعلام کرد. این وضعیت به معنی انتخاب‌شدن یا دریافت جایزه نیست.' })[r.stage] ?? 'وضعیت نیاز به بررسی دارد.';
    for (const [label, value] of [['شناسهٔ ثبت عامل', r.offerId], ['تراکنش هزینه', r.paymentTx], ['شناسهٔ پیشنهاد', r.bidId]]) {
      if (!value) continue;
      const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = label; dd.textContent = value; dd.dir = 'ltr'; $('receipt-fields').append(dt, dd);
    }
  }
}
async function run(action, pending, success) {
  status(pending);
  try {
    const promise = action(); render(); await promise; status(typeof success === 'function' ? success() : success);
  } catch (e) {
    status(messages[e?.code] ?? 'عملیات کامل نشد. اگر رسیدی نمایش داده می‌شود، آن را ذخیره و در گفتگو بررسی کن.', true);
  } finally { render(); }
}
function getStorage() { return window.localStorage; }
function initialise() {
  if (window.top !== window.self) {
    for (const button of document.querySelectorAll('button')) button.disabled = true;
    status('این صفحه را مستقیم در مرورگر داخلی Bitget Wallet باز کن؛ امضا در صفحهٔ جاسازی‌شده غیرفعال است.', true);
    return;
  }
  try { client = new EntryClient({ provider, template, approach, storage: getStorage() }); }
  catch { status(messages.STORAGE_REQUIRED, true); $('connect').disabled = true; return; }
  for (const event of ['accountsChanged', 'chainChanged', 'disconnect']) provider?.on?.(event, () => {
    if (client.account) { client.invalidate(); $('fee-consent').checked = false; $('bid-consent').checked = false; render(); status(messages.WALLET_CHANGED, true); }
  });
  window.addEventListener('storage', event => {
    if (event.key === client.storageKey && event.newValue) {
      client.invalidate(); $('fee-consent').checked = false; $('bid-consent').checked = false; render();
      status('وضعیت در صفحهٔ دیگری تغییر کرد. برای خواندن آخرین رسید، اتصال و بررسی مشخصات را بزن.');
    }
  });
  $('connect').addEventListener('click', () => run(() => client.connect(), 'درخواست اتصال و بررسی مشخصات...', () => client.receipt ? 'کیف پول متصل و رسید قبلی بازیابی شد. وضعیت رسید را بررسی کن.' : 'کیف پول و شرایط 0.01 USDC بررسی شد. پیش از ادامه، مشخصات را بخوان.'));
  $('register').addEventListener('click', () => {
    if (!$('fee-consent').checked || $('register').disabled) return;
    run(() => client.register(), 'در حال بررسی نهایی و درخواست امضای فقط 0.01 USDC در کیف پول...', 'پروفایل در LAX فهرست شد. مرحلهٔ پیشنهاد نیاز به تأیید و امضای جداگانه دارد.');
  });
  $('bid').addEventListener('click', () => {
    if (!$('bid-consent').checked || $('bid').disabled) return;
    run(() => client.sendBid(), 'درخواست امضای متن و شناسهٔ پیشنهاد در کیف پول...', 'LAX دریافت پیشنهاد را اعلام کرد. رسید را ذخیره کن.');
  });
  $('check').addEventListener('click', () => run(() => client.checkListing(), 'در حال بررسی فهرست‌شدن همان عامل...', 'اطلاعات فهرست‌شدن بررسی شد.'));
  $('download').addEventListener('click', () => {
    if (!client.receipt) return;
    const blob = new Blob([JSON.stringify({ ...client.receipt, receiptFor: 'LAX MCP server', listingFeeUsdc: '0.01', network: 'Base', listingFeeRecipient: LIMITS.recipient, bidPriceUsdc: LIMITS.price, delivery: LIMITS.delivery }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'LAX-Entry-Receipt.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('fee-consent').addEventListener('change', render); $('bid-consent').addEventListener('change', render);
  $('approach').textContent = approach;
  $('open-wallet').hidden = !!provider?.request;
  const target = new URL('./', window.location.href); target.search = ''; target.hash = '';
  const link = new URL('https://bkcode.vip'); link.searchParams.set('action', 'dapp'); link.searchParams.set('url', target.href); link.searchParams.set('version', '1');
  $('bitget-link').href = link.href;
  render();
}
initialise();
