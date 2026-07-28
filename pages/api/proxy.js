/**
 * Vercel-compatible media proxy.
 * Usage: GET /api/proxy?url=<encoded-cdn-url>[&filename=custom.mp4]
 *
 * Why this exists: CDN links returned by /api/download expire (Instagram
 * links carry an `oe` param roughly 33h out), and some hosts reject
 * cross-origin playback. Proxying keeps playback/download working and
 * hides the upstream URL from the client.
 *
 * Headers must be chosen per host: sending a TikTok Referer to
 * video.twimg.com returns HTTP 403, so a single hardcoded set breaks
 * Twitter.
 */

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// host suffix -> { referer, origin } used when talking to that CDN.
// `null` referer means send none (Twitter rejects a foreign Referer).
const HOST_RULES = [
  { match: ['tiktokcdn.com', 'tiktokcdn-us.com', 'tiktokv.com', 'tiktok.com', 'muscdn.com', 'ibyteimg.com'],
    referer: 'https://www.tiktok.com/', label: 'tiktok', ext: 'mp4' },
  { match: ['cdninstagram.com', 'instagram.com'],
    referer: 'https://www.instagram.com/', label: 'instagram', ext: 'mp4' },
  { match: ['fbcdn.net', 'facebook.com'],
    referer: 'https://www.facebook.com/', label: 'facebook', ext: 'mp4' },
  { match: ['twimg.com'],
    referer: null, label: 'twitter', ext: 'mp4' },
  { match: ['rapidcdn.app'],
    referer: 'https://snapsave.app/', label: 'snapsave', ext: 'mp4' }
];

function resolveRule(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (_) {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;

  const host = parsed.hostname.toLowerCase();
  return HOST_RULES.find(rule =>
    rule.match.some(allowed => host === allowed || host.endsWith(`.${allowed}`))
  ) || null;
}

function safeFilename(value, fallback) {
  if (!value) return fallback;
  const cleaned = String(value).replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 80);
  return cleaned || fallback;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const target = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  const rule = target ? resolveRule(target) : null;

  if (!rule) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_URL',
        message: 'Butuh URL HTTPS dari CDN yang didukung',
        supported: ['TikTok', 'Instagram', 'Facebook', 'Twitter/X', 'SnapSave']
      }
    });
  }

  const headers = {
    'User-Agent': BROWSER_UA,
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9'
  };
  if (rule.referer) {
    headers.Referer = rule.referer;
    headers.Origin = rule.referer.replace(/\/$/, '');
  }
  // Preserve range requests so browser seeking and resume work.
  if (req.headers.range) headers.Range = req.headers.range;

  try {
    const upstream = await fetch(target, { method: 'GET', headers, redirect: 'follow' });

    if (!upstream.ok) {
      const expired = upstream.status === 403 || upstream.status === 410;
      return res.status(upstream.status).json({
        success: false,
        error: {
          code: expired ? 'LINK_EXPIRED' : 'UPSTREAM_ERROR',
          message: expired
            ? 'Link CDN sudah kedaluwarsa, silakan request ulang via /api/download'
            : `CDN ${rule.label} mengembalikan HTTP ${upstream.status}`
        }
      });
    }

    const contentType = upstream.headers.get('content-type') || 'video/mp4';
    const ext = contentType.includes('image/')
      ? (contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg')
      : contentType.includes('audio/') ? 'mp3' : rule.ext;

    const filename = safeFilename(
      Array.isArray(req.query.filename) ? req.query.filename[0] : req.query.filename,
      `${rule.label}-${Date.now()}.${ext}`
    );

    // inline=1 lets a <video>/<img> play the media in place; the default
    // stays "attachment" so download buttons still save to disk.
    const inline = ['1', 'true', 'yes'].includes(
      String(Array.isArray(req.query.inline) ? req.query.inline[0] : req.query.inline).toLowerCase()
    );

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');
    res.setHeader('Cache-Control', inline ? 'private, max-age=600' : 'private, no-store');
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${filename}"`
    );

    for (const name of ['content-length', 'content-range']) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }

    res.statusCode = upstream.status;
    if (!upstream.body) return res.end();

    const reader = upstream.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
    return res.end();
  } catch (error) {
    console.error('Proxy error:', error.message);
    return res.status(502).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: `Gagal mengambil media dari CDN ${rule.label}` }
    });
  }
}
