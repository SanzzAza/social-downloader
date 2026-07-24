/**
 * Vercel-compatible TikTok media proxy.
 * Usage: GET /api/proxy?url=<encoded-tiktok-cdn-url>
 */

const ALLOWED_HOSTS = [
  'tiktokcdn.com',
  'tiktokv.com',
  'tiktok.com'
];

function isAllowedMediaUrl(value) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_HOSTS.some(
      allowed => host === allowed || host.endsWith(`.${allowed}`)
    );
  } catch (_) {
    return false;
  }
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

  if (!target || !isAllowedMediaUrl(target)) {
    return res.status(400).json({
      success: false,
      error: 'A valid HTTPS TikTok CDN URL is required'
    });
  }

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
    'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.tiktok.com/',
    'Origin': 'https://www.tiktok.com'
  };

  // Preserve range requests so browser video playback and resume work.
  if (req.headers.range) headers.Range = req.headers.range;

  try {
    const upstream = await fetch(target, {
      method: 'GET',
      headers,
      redirect: 'follow'
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error: `TikTok CDN returned HTTP ${upstream.status}`
      });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'video/mp4');
    res.setHeader('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', 'attachment; filename="tiktok-video.mp4"');

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
    console.error('TikTok proxy error:', error.message);
    return res.status(502).json({
      success: false,
      error: 'Could not fetch media from TikTok CDN'
    });
  }
}
