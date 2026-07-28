/**
 * GET /api/platforms - supported platforms and their URL patterns.
 */

const PLATFORMS = [
  {
    name: 'TikTok',
    slug: 'tiktok',
    patterns: ['tiktok.com', 'vm.tiktok.com'],
    media: ['video', 'image', 'audio'],
    sources: ['tikwm']
  },
  {
    name: 'Instagram',
    slug: 'instagram',
    patterns: ['instagram.com'],
    media: ['video', 'image', 'carousel'],
    sources: ['snapsave', 'downloadgram']
  },
  {
    name: 'Facebook',
    slug: 'facebook',
    patterns: ['facebook.com', 'fb.watch'],
    media: ['video'],
    sources: ['snapsave']
  },
  {
    name: 'Twitter/X',
    slug: 'twitter',
    patterns: ['twitter.com', 'x.com'],
    media: ['video', 'image', 'gif'],
    sources: ['twitter_syndication']
  },
  {
    name: 'Threads',
    slug: 'threads',
    patterns: ['threads.net', 'threads.com'],
    media: ['video', 'image'],
    sources: ['threads_og']
  }
];

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  return res.status(200).json({
    success: true,
    count: PLATFORMS.length,
    platforms: PLATFORMS
  });
}
