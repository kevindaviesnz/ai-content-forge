import { logger } from "./logger.js";

// ─── Retry Config ─────────────────────────────────────────────────────────────

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

// ─── Retryable Error Classification ──────────────────────────────────────────

/**
 * Determines whether an error is transient and worth retrying.
 * Non-retryable errors (e.g. auth failures, invalid requests) fail immediately.
 */
function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return true;

  const message = err.message.toLowerCase();

  // Hard failures — no point retrying
  const nonRetryablePatterns = [
    "invalid api key",
    "authentication",
    "unauthorized",
    "permission denied",
    "not valid json",       // JSON parse failure — retry won't fix a bad prompt
    "invalid request",
  ];

  if (nonRetryablePatterns.some((p) => message.includes(p))) {
    return false;
  }

  // HTTP status codes embedded in error messages (common across SDKs)
  const statusMatch = message.match(/status[:\s]+(\d{3})/i) ??
                      message.match(/(\d{3})/);
  if (statusMatch) {
    const status = parseInt(statusMatch[1], 10);
    // 4xx client errors (except 429 rate limit) are not retryable
    if (status >= 400 && status < 500 && status !== 429) {
      return false;
    }
  }

  return true;
}

// ─── Exponential Backoff ──────────────────────────────────────────────────────

function computeDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff with jitter: delay = min(initialDelay * 2^attempt + jitter, maxDelay)
  const exponential = config.initialDelayMs * Math.pow(2, attempt);
  const jitter      = Math.random() * config.initialDelayMs * 0.5;
  return Math.min(exponential + jitter, config.maxDelayMs);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── withRetry ────────────────────────────────────────────────────────────────

/**
 * Wraps any async operation with exponential backoff retry logic.
 *
 * @param agentName  Used in log messages to identify which agent is retrying
 * @param fn         The async operation to attempt
 * @param config     Retry parameters (maxRetries, initialDelayMs, maxDelayMs)
 *
 * @throws The last error encountered if all retries are exhausted
 */
export async function withRetry<T>(
  agentName: string,
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const isLastAttempt = attempt === config.maxRetries;
      const retryable     = isRetryable(err);

      if (isLastAttempt || !retryable) {
        logger.agentError(
          agentName,
          isLastAttempt
            ? `All ${config.maxRetries} retries exhausted`
            : `Non-retryable error — failing immediately`
        );
        throw err;
      }

      const delayMs = computeDelay(attempt, config);
      logger.agentRetry(agentName, attempt + 1, config.maxRetries, delayMs);
      await sleep(delayMs);
    }
  }

  // TypeScript requires this even though the loop always returns or throws
  throw lastError;
}