export type Fetch = typeof globalThis.fetch;
export type AuditEvent = Readonly<{
  tool: string;
  outcome: 'ok' | 'error';
  durationMs: number;
  status?: number;
}>;

export interface LaxMcpOptions {
  baseUrl?: string;
  fetch?: Fetch;
  timeoutMs?: number;
  maxResponseBytes?: number;
  allowSubmit?: boolean;
  /** Receives metadata only, never arguments, contacts, addresses, headers or response bodies. */
  audit?: (event: AuditEvent) => void;
}

export class RegistryError extends Error {
  constructor(message: string, readonly status?: number) { super(message); }
}

function cleanMessage(value: string): string {
  return value.replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 600);
}

function errorMessage(raw: string, fallback: string): string {
  try {
    const json: unknown = JSON.parse(raw);
    if (typeof json === 'string' && json.trim()) return cleanMessage(json);
    if (json && typeof json === 'object') {
      const item = json as Record<string, unknown>;
      for (const key of ['error', 'message', 'detail']) {
        if (typeof item[key] === 'string' && item[key]) return cleanMessage(item[key]);
        if (key === 'error' && item[key] && typeof item[key] === 'object') {
          const nested = item[key] as Record<string, unknown>;
          if (typeof nested.message === 'string') return cleanMessage(nested.message);
        }
      }
    }
  } catch {
    // Plain-text API errors are useful, but an HTML proxy page is not.
    const plain = raw.trim();
    if (plain && !/[<>]/.test(plain)) return cleanMessage(plain);
  }
  return fallback;
}

async function boundedText(response: Response, limit: number): Promise<string> {
  const length = response.headers.get('content-length');
  if (length && /^\d+$/.test(length) && Number(length) > limit) {
    await response.body?.cancel();
    throw new RegistryError(`HTTP ${response.status}: Registry response exceeds the configured size limit.`, response.status);
  }
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new RegistryError(`HTTP ${response.status}: Registry response exceeds the configured size limit.`, response.status);
      }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const joined = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(joined); }
  catch { throw new RegistryError(`HTTP ${response.status}: Registry returned invalid UTF-8.`, response.status); }
}

export class RegistryClient {
  readonly allowSubmit: boolean;
  private readonly baseUrl: URL;
  private readonly fetchImpl: Fetch;
  private readonly timeoutMs: number;
  private readonly maxResponseBytes: number;

  constructor(private readonly options: LaxMcpOptions = {}) {
    this.baseUrl = new URL(options.baseUrl ?? 'https://lax.kognai.ai/registry');
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(this.baseUrl.hostname);
    if ((this.baseUrl.protocol !== 'https:' && !(this.baseUrl.protocol === 'http:' && loopback))
      || this.baseUrl.username || this.baseUrl.password || this.baseUrl.search || this.baseUrl.hash) {
      throw new Error('baseUrl must use HTTPS (HTTP is allowed on loopback only), without credentials, a query or a fragment.');
    }
    this.baseUrl.pathname = this.baseUrl.pathname.replace(/\/+$/, '') + '/';
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.maxResponseBytes = options.maxResponseBytes ?? 1_048_576;
    this.allowSubmit = options.allowSubmit ?? true;
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 120_000) {
      throw new Error('timeoutMs must be an integer from 1 to 120000.');
    }
    if (!Number.isSafeInteger(this.maxResponseBytes) || this.maxResponseBytes < 1) {
      throw new Error('maxResponseBytes must be a positive safe integer.');
    }
  }

  audit(event: AuditEvent): void {
    try { this.options.audit?.(Object.freeze(event)); } catch { /* Diagnostics cannot break a tool. */ }
  }

  async request(path: string, query?: Record<string, unknown>, body?: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
    const url = new URL(path, this.baseUrl);
    for (const [name, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(name, String(value));
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abortListener: (() => void) | undefined;
    const interrupted = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new RegistryError('Registry request timed out.'));
      }, this.timeoutMs);
      abortListener = () => {
        controller.abort();
        reject(new RegistryError('Registry request was cancelled.'));
      };
      if (signal?.aborted) abortListener();
      else signal?.addEventListener('abort', abortListener, { once: true });
    });
    const operation = async (): Promise<unknown> => {
      if (controller.signal.aborted) throw new RegistryError('Registry request was cancelled.');
      const response = await this.fetchImpl(url.toString(), {
        method: body === undefined ? 'GET' : 'POST',
        headers: body === undefined ? { accept: 'application/json' }
          : { accept: 'application/json', 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        redirect: 'manual',
        signal: controller.signal,
      });
      const text = await boundedText(response, this.maxResponseBytes);
      if (!response.ok) {
        throw new RegistryError(`HTTP ${response.status}: ${errorMessage(text, 'Registry rejected the request.')}`, response.status);
      }
      try { return JSON.parse(text); }
      catch { throw new RegistryError(`HTTP ${response.status}: Registry returned invalid JSON.`, response.status); }
    };
    try { return await Promise.race([operation(), interrupted]); }
    catch (error) {
      if (error instanceof RegistryError) throw error;
      throw new RegistryError('Registry request failed. Check connectivity and try again.');
    } finally {
      clearTimeout(timer);
      if (abortListener) signal?.removeEventListener('abort', abortListener);
    }
  }
}
