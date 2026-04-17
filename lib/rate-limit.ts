/**
 * In-memory rate limiter
 * ──────────────────────
 * Uses a module-level Map that persists across warm serverless invocations.
 *
 * Trade-off: In a multi-instance deployment (Vercel auto-scaling) each
 * instance tracks its own window independently. For the volumes this platform
 * handles this is acceptable — a determined attacker with 10 instances still
 * faces a 10× harder job than with no limiting at all.
 *
 * Upgrade path: Replace `store` with an Upstash Redis client when you need
 * distributed, cross-instance rate limiting. The rest of the API stays the same.
 */

interface RateLimitEntry {
  /** Number of qualifying requests in the current window */
  count: number
  /** When the current window started (Unix ms) */
  windowStart: number
  /** If set, all requests are blocked until this time (Unix ms) */
  lockedUntil?: number
}

// Module-level store — never grows unbounded because of maybePrune() below.
const store = new Map<string, RateLimitEntry>()

/**
 * Prune entries that are older than 2× the window to prevent memory growth.
 * Called every 100 invocations — cheap and avoids a separate setInterval
 * (which would keep the function alive in serverless environments).
 */
let callsSinceLastPrune = 0
function maybePrune(windowMs: number): void {
  if (++callsSinceLastPrune % 100 !== 0) return
  const cutoff = Date.now() - windowMs * 2
  for (const [key, entry] of store) {
    if (entry.windowStart < cutoff && (!entry.lockedUntil || entry.lockedUntil < Date.now())) {
      store.delete(key)
    }
  }
}

// ─── Public types ────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Maximum qualifying requests allowed in the window */
  limit: number
  /** Window length in milliseconds */
  windowMs: number
  /**
   * How long to block the key after the limit is breached.
   * Defaults to windowMs.  Set to 0 to just count (no lockout).
   */
  lockoutMs?: number
}

export interface RateLimitResult {
  /** Whether this request is allowed to proceed */
  allowed: boolean
  /** Attempts remaining before lockout (within the current window) */
  remaining: number
  /** Seconds until the rate-limit window or lockout resets */
  retryAfter: number
}

// ─── Core function ───────────────────────────────────────────────────────────

/**
 * Check whether a key (typically "endpoint:ip") has exceeded its quota.
 *
 * IMPORTANT: Only call this for *failing* attempts where you want to count
 * toward the limit (e.g. bad password, invalid code).  Don't call it on
 * successful requests — this keeps the limit from punishing legitimate users
 * who eventually succeed.
 *
 * @param key     Unique string identifying the caller (e.g. "admin-auth:1.2.3.4")
 * @param config  Limit configuration
 * @returns       { allowed, remaining, retryAfter }
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const { limit, windowMs, lockoutMs = windowMs } = config
  const now = Date.now()

  maybePrune(windowMs)

  const entry = store.get(key)

  // ── Active lockout ────────────────────────────────────────────────────────
  if (entry?.lockedUntil && now < entry.lockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.lockedUntil - now) / 1000),
    }
  }

  // ── Start a fresh window ──────────────────────────────────────────────────
  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: limit - 1, retryAfter: 0 }
  }

  // ── Within an existing window ─────────────────────────────────────────────
  entry.count += 1

  if (entry.count > limit) {
    // Transition to lockout on the first breach
    if (!entry.lockedUntil) {
      entry.lockedUntil = now + lockoutMs
    }
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.lockedUntil - now) / 1000),
    }
  }

  return {
    allowed: true,
    remaining: limit - entry.count,
    retryAfter: 0,
  }
}

/**
 * Clears any rate-limit record for the given key.
 * Call this after a *successful* authentication so a legitimate user
 * who mistyped their password a few times doesn't stay penalised.
 */
export function resetRateLimit(key: string): void {
  store.delete(key)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extracts the real client IP from Vercel / standard proxy headers.
 * Falls back to "unknown" so rate limiting degrades gracefully.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  )
}

/**
 * Build a 429 Response with the mandatory Retry-After header.
 */
export function buildRateLimitResponse(retryAfter: number, message: string): Response {
  return new Response(
    JSON.stringify({ error: message, retryAfter }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  )
}
