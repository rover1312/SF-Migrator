import { chunk, isRetryable, runWithConcurrency, withRetry } from '../../src/server/utils/retry';

describe('retry utils', () => {
  it('retries transient errors then succeeds', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error('429 rate limit');
        return 'ok';
      },
      { baseMs: 1 },
    );
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('does not retry permanent errors', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new Error('INVALID_FIELD: nope');
        },
        { baseMs: 1 },
      ),
    ).rejects.toThrow(/INVALID_FIELD/);
    expect(calls).toBe(1);
  });

  it('classifies retryable errors', () => {
    expect(isRetryable(new Error('Request failed 503'))).toBe(true);
    expect(isRetryable(new Error('socket hang up'))).toBe(true);
    expect(isRetryable(new Error('MALFORMED_QUERY'))).toBe(false);
  });

  it('chunks arrays', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('limits concurrency but keeps order', async () => {
    let inFlight = 0;
    let maxFlight = 0;
    const out = await runWithConcurrency([1, 2, 3, 4], 2, async (n) => {
      inFlight += 1;
      maxFlight = Math.max(maxFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight -= 1;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8]);
    expect(maxFlight).toBeLessThanOrEqual(2);
  });
});
