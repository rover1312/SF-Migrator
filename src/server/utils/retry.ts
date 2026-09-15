/** Retry with exponential backoff + small concurrency helper. */

export interface RetryOptions {
  attempts?: number;
  baseMs?: number;
  maxMs?: number;
  retryOn?: (err: Error) => boolean;
}

const RETRYABLE_PATTERNS = [
  /429/,
  /\b5\d\d\b/,
  /ECONNRESET/,
  /ETIMEDOUT/,
  /socket hang up/i,
  /ENOTFOUND/,
];

/** True for rate-limit, server-side, and transient network failures. */
export function isRetryable(err: Error): boolean {
  const message = `${err.message} ${(err as { code?: unknown }).code ?? ''}`;
  return RETRYABLE_PATTERNS.some((pattern) => pattern.test(message));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exported for polling loops (Bulk API, job watchers). */
export async function sleepMs(ms: number): Promise<void> {
  return sleep(ms);
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? 4;
  const baseMs = options.baseMs ?? 500;
  const maxMs = options.maxMs ?? 8000;
  const retryOn = options.retryOn ?? isRetryable;
  let lastError: Error = new Error('withRetry: no attempts');
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err as Error;
      if (attempt === attempts || !retryOn(lastError)) throw lastError;
      await sleep(Math.min(maxMs, baseMs * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

export function chunk<T>(items: T[], size: number): T[][] {
  if (size < 1) throw new Error('chunk size must be >= 1');
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Map items with at most `limit` promises in flight. Results keep input order. */
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (limit < 1) throw new Error('concurrency limit must be >= 1');
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}
