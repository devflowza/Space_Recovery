interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  retryAfterMs: number;
}

interface RateLimitConfig {
  key: string;
  maxRequests: number;
  windowMs: number;
}

class ClientRateLimiter {
  private windows: Map<string, number[]> = new Map();

  check(key: string, maxRequests: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const timestamps = this.windows.get(key) || [];

    // Remove expired timestamps
    const windowStart = now - windowMs;
    const valid = timestamps.filter((t) => t > windowStart);

    if (valid.length >= maxRequests) {
      const oldestInWindow = valid[0];
      const retryAfterMs = oldestInWindow + windowMs - now;
      this.windows.set(key, valid);
      return {
        allowed: false,
        remainingRequests: 0,
        retryAfterMs: Math.max(0, retryAfterMs),
      };
    }

    valid.push(now);
    this.windows.set(key, valid);

    return {
      allowed: true,
      remainingRequests: maxRequests - valid.length,
      retryAfterMs: 0,
    };
  }

  reset(key: string): void {
    this.windows.delete(key);
  }
}

export const rateLimiter = new ClientRateLimiter();

export const RATE_LIMITS = {
  EMAIL_SEND: { key: 'email_send', maxRequests: 5, windowMs: 60_000 },
  PDF_GENERATION: { key: 'pdf_generation', maxRequests: 3, windowMs: 60_000 },
  FILE_UPLOAD: { key: 'file_upload', maxRequests: 10, windowMs: 60_000 },
  BULK_IMPORT: { key: 'bulk_import', maxRequests: 1, windowMs: 60_000 },
  INVOICE_CONVERSION: { key: 'invoice_conversion', maxRequests: 3, windowMs: 60_000 },
  CASE_DELETION: { key: 'case_deletion', maxRequests: 5, windowMs: 60_000 },
  PORTAL_LOGIN: { key: 'portal_login', maxRequests: 5, windowMs: 60_000 },
} as const;

export function checkRateLimit(config: RateLimitConfig): {
  allowed: boolean;
  message: string;
  retryAfterMs: number;
} {
  const result = rateLimiter.check(config.key, config.maxRequests, config.windowMs);

  if (!result.allowed) {
    const retrySeconds = Math.ceil(result.retryAfterMs / 1000);
    return {
      allowed: false,
      message: `Rate limit exceeded. Please try again in ${retrySeconds} seconds.`,
      retryAfterMs: result.retryAfterMs,
    };
  }

  return { allowed: true, message: '', retryAfterMs: 0 };
}
