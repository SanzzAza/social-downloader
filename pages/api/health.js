/**
 * GET /api/health - liveness probe.
 *
 * The old handler tried to serve this from inside /api/download by
 * comparing req.url, which never matched: Next.js uses file-based
 * routing, so /api/health needs its own file.
 */

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  return res.status(200).json({
    success: true,
    status: 'healthy',
    version: '1.2.0',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    endpoints: {
      download: 'POST /api/download',
      proxy: 'GET /api/proxy?url=',
      sticker: 'GET /api/sticker?text=',
      tweet: 'GET /api/tweet?displayName=&username=&comment=',
      brat: 'GET /api/brat?text=&delay=500',
      platforms: 'GET /api/platforms'
    }
  });
}
