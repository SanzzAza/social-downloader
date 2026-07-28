/**
 * In-memory sliding-window rate limiter.
 *
 * Serverless caveat: state lives per warm instance, so this is a cheap
 * abuse brake, not a strict global quota. Swap the Map for Redis/KV if
 * exact limits ever matter.
 */

const buckets = new Map();
const MAX_TRACKED = 5000;

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

/**
 * @param {object} req
 * @param {object} res
 * @param {{ limit?: number, windowMs?: number, key?: string }} [options]
 * @returns {boolean} true when the request may proceed
 */
function rateLimit(req, res, options = {}) {
  const limit = options.limit ?? 20;
  const windowMs = options.windowMs ?? 60_000;
  const bucketKey = `${options.key || 'default'}:${clientIp(req)}`;
  const now = Date.now();

  let hits = buckets.get(bucketKey) || [];
  hits = hits.filter(stamp => now - stamp < windowMs);

  const allowed = hits.length < limit;
  if (allowed) hits.push(now);
  buckets.set(bucketKey, hits);

  // Opportunistic cleanup so the map cannot grow without bound.
  if (buckets.size > MAX_TRACKED) {
    for (const [key, stamps] of buckets) {
      if (!stamps.length || now - stamps[stamps.length - 1] > windowMs) {
        buckets.delete(key);
      }
      if (buckets.size <= MAX_TRACKED / 2) break;
    }
  }

  const remaining = Math.max(0, limit - hits.length);
  const resetSec = hits.length
    ? Math.ceil((hits[0] + windowMs - now) / 1000)
    : Math.ceil(windowMs / 1000);

  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', resetSec);

  if (!allowed) {
    res.setHeader('Retry-After', resetSec);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Terlalu banyak request. Coba lagi dalam ${resetSec} detik.`,
        limit,
        windowSeconds: Math.round(windowMs / 1000)
      }
    });
    return false;
  }

  return true;
}

module.exports = { rateLimit };
