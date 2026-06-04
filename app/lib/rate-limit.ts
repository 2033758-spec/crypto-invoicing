// Simple in-memory rate limiter for API endpoints
// Tracks requests by IP + route and enforces limits
// TODO: Replace with Upstash Redis for persistent rate limiting across instances (W9+)

interface RateLimitEntry {
  timestamps: number[];
}

const limits = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL = 60000; // Clean old entries every minute

// Cleanup stale entries (older than 1 hour)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of limits.entries()) {
    entry.timestamps = entry.timestamps.filter(ts => now - ts < 3600000);
    if (entry.timestamps.length === 0) {
      limits.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

export function checkRateLimit(
  ip: string,
  route: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSec?: number } {
  const key = `${route}:${ip}`;
  const now = Date.now();

  let entry = limits.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    limits.set(key, entry);
  }

  // Remove old timestamps outside the window
  entry.timestamps = entry.timestamps.filter(ts => now - ts < windowMs);

  // Check if over limit
  if (entry.timestamps.length >= maxRequests) {
    const oldestRequest = entry.timestamps[0];
    const retryAfterMs = windowMs - (now - oldestRequest);
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    return { allowed: false, retryAfterSec };
  }

  // Add current request
  entry.timestamps.push(now);
  return { allowed: true };
}

export function getClientIp(request: Request): string {
  // Check X-Forwarded-For (Vercel, CloudFlare)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  // Fallback (shouldn't hit in production)
  return "127.0.0.1";
}
