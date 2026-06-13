const DEFAULT_ATTEMPTS = 3;
const DEFAULT_DELAY_MS = 250;

type RetryOptions = {
  attempts?: number;
  delayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
};

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const shouldRetry = options.shouldRetry ?? (() => true);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === attempts || !shouldRetry(error)) {
        throw error;
      }

      await delay(delayMs * attempt);
    }
  }

  throw lastError;
}

export function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}
