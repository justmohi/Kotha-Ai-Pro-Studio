export class AbortError extends Error {
  originalError?: Error;
  constructor(message: string | Error) {
    super(message instanceof Error ? message.message : message);
    if (message instanceof Error) {
      this.originalError = message;
      this.stack = message.stack;
    }
    this.name = 'AbortError';
  }
}

export interface PRetryOptions {
  retries?: number;
  factor?: number;
  minTimeout?: number;
  maxTimeout?: number;
  randomize?: boolean;
  onFailedAttempt?: (error: any) => void | Promise<void>;
}

export default async function pRetry<T>(
  fn: (attempt: number) => Promise<T> | T,
  options: PRetryOptions = {}
): Promise<T> {
  const retries = typeof options.retries === 'number' ? options.retries : 2;
  const factor = typeof options.factor === 'number' ? options.factor : 2;
  const minTimeout = typeof options.minTimeout === 'number' ? options.minTimeout : 1000;
  const maxTimeout = typeof options.maxTimeout === 'number' ? options.maxTimeout : 60000;

  let attempt = 0;
  while (true) {
    attempt++;
    try {
      return await fn(attempt);
    } catch (err: any) {
      if (err instanceof AbortError || (err && err.name === 'AbortError')) {
        throw err.originalError || err;
      }
      if (attempt > retries) {
        throw err;
      }
      if (typeof options.onFailedAttempt === 'function') {
        try {
          await options.onFailedAttempt(err);
        } catch (onFailedErr) {
          throw onFailedErr;
        }
      }
      const delay = Math.min(minTimeout * Math.pow(factor, attempt - 1), maxTimeout);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
