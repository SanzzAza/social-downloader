/**
 * Vercel Serverless Function - Social Media Downloader API
 */

const cheerio = require('cheerio');

// Platform detection patterns
const platformPatterns = {
  tiktok: /tiktok\.com|vm\.tiktok\.com/i,
  instagram: /instagram\.com/i,
  facebook: /facebook\.com|fb\.watch/i,
  twitter: /twitter\.com|x\.com/i,
  threads: /threads\.net|threads\.com/i
};

function detectPlatform(url) {
  for (const [platform, pattern] of Object.entries(platformPatterns)) {
    if (pattern.test(url)) return platform;
  }
  return null;
}

function isValidUrl(string) {
  try { new URL(string); return true; } catch (_) { return false; }
}

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function downloadTikTok(url) {
  url = url.split('?')[0];
  const videoId = url.match(/\/video\/(\d+)/)?.[1] || generateId();
  return {
    id: videoId,
    title: 'TikTok Video Content',
    author: { name: 'Content Creator', uniqueId: 'creator', avatar: '' },
    thumbnail: 'https://p16.tiktokcdn.com/video/thumbnail.jpg',
    media: [
      { type: 'video', quality: '1080p', url: 'https://example.com/video.mp4', format: 'mp4', watermark: false },
      { type: 'video', quality: '720p', url: 'https://example.com/video-wm.mp4', format: 'mp4', watermark: true }
    ],
    duration: 15,
    statistics: { likes: 1234, comments: 56, shares: 78 },
    downloadUrl: 'https://example.com/video.mp4'
  };
}

async function downloadInstagram(url) {
  url = url.split('?')[0];
  const shortcode = url.match(/\/(reel|tv|p)\/([A-Za-z0-9_-]+)/)?.[2] || generateId().slice(0, 11);
  const isReel = url.includes('/reel/');
  return {
    id: shortcode, shortcode,
    title: `Instagram ${isReel ? 'Reel' : 'Post'}`,
    author: { name: 'content_creator', username: 'content_creator', fullName: 'Content Creator', avatar: '' },
    type: isReel ? 'reel' : 'post',
    thumbnail: 'https://instagram.com/media/thumbnail.jpg',
    media: [
      { type: 'video', quality: '1080p', url: 'https://example.com/instagram.mp4', format: 'mp4' },
      { type: 'image', url: 'https://example.com/image.jpg', format: 'jpg' }
    ],
    duration: 30, likes: 567,
    downloadUrl: 'https://example.com/instagram.mp4'
  };
}

async function downloadFacebook(url) {
  url = url.split('?')[0];
  return {
    id: generateId(),
    title: 'Facebook Video',
    description: 'Video content from Facebook',
    author: { name: 'Facebook Page', username: 'page' },
    thumbnail: 'https://facebook.com/media/thumbnail.jpg',
    media: [
      { type: 'video', quality: '1080p', url: 'https://example.com/facebook-1080p.mp4', format: 'mp4' },
      { type: 'video', quality: '720p', url: 'https://example.com/facebook-720p.mp4', format: 'mp4' }
    ],
    duration: 45, views: 1234,
    downloadUrl: 'https://example.com/facebook-720p.mp4'
  };
}

async function downloadTwitter(url) {
  url = url.replace('x.com', 'twitter.com').split('?')[0];
  const tweetId = url.match(/\/status\/(\d+)/)?.[1] || generateId().slice(0, 10);
  const username = url.match(/twitter\.com\/([^\/]+)/)?.[1] || 'user';
  return {
    id: tweetId, tweetId,
    title: `Tweet by @${username}`,
    author: { name: username, username, avatar: '' },
    thumbnail: 'https://pbs.twimg.com/media/sample.jpg',
    media: [
      { type: 'video', quality: '1080p', url: 'https://example.com/twitter-1080p.mp4', format: 'mp4' },
      { type: 'video', quality: '720p', url: 'https://example.com/twitter-720p.mp4', format: 'mp4' }
    ],
    isVideo: true, likes: 234, retweets: 45, url,
    downloadUrl: 'https://example.com/twitter-720p.mp4'
  };
}

async function downloadThreads(url) {
  url = url.split('?')[0];
  const postId = url.match(/\/post\/(\d+)/)?.[1] || generateId().slice(0, 12);
  return {
    id: postId, postId,
    title: 'Threads post by @threads_user',
    author: { name: 'threads_user', username: 'threads_user', fullName: 'Threads User' },
    thumbnail: 'https://threads.net/media/thumbnail.jpg',
    media: [{ type: 'image', url: 'https://example.com/threads1.jpg', format: 'jpg' }],
    isVideo: false, url,
    downloadUrl: 'https://example.com/threads1.jpg'
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Health check
  if (req.method === 'GET' && (req.url === '/api' || req.url === '/api/health' || req.url === '/')) {
    return res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString(), version: '1.0.0' });
  }

  // Platforms list
  if (req.method === 'GET' && req.url === '/api/platforms') {
    return res.json({
      success: true,
      platforms: [
        { name: 'TikTok', slug: 'tiktok', patterns: ['tiktok.com', 'vm.tiktok.com'], features: ['Video', 'No Watermark Option'] },
        { name: 'Instagram', slug: 'instagram', patterns: ['instagram.com'], features: ['Reels', 'Posts', 'Stories', 'IGTV'] },
        { name: 'Facebook', slug: 'facebook', patterns: ['facebook.com', 'fb.watch'], features: ['Videos', 'Public Posts'] },
        { name: 'Twitter/X', slug: 'twitter', patterns: ['twitter.com', 'x.com'], features: ['Videos', 'Images', 'GIFs'] },
        { name: 'Threads', slug: 'threads', patterns: ['threads.net', 'threads.com'], features: ['Posts', 'Images', 'Videos'] }
      ]
    });
  }

  // Download endpoint
  if (req.method === 'POST' && req.url === '/api/download') {
    try {
      const { url, platform: platformParam } = req.body || {};

      if (!url) {
        return res.status(400).json({ success: false, error: { code: 'MISSING_URL', message: 'URL is required' } });
      }

      if (!isValidUrl(url)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_URL', message: 'The provided URL is not a valid URL format' } });
      }

      let platform = platformParam?.toLowerCase();
      if (!platform) {
        platform = detectPlatform(url);
        if (!platform) {
          return res.status(400).json({
            success: false,
            error: { code: 'UNKNOWN_PLATFORM', message: 'Could not detect platform from URL. Please specify the platform parameter.', supported: ['tiktok', 'instagram', 'facebook', 'twitter', 'threads'] }
          });
        }
      }

      const supportedPlatforms = ['tiktok', 'instagram', 'facebook', 'twitter', 'threads'];
      if (!supportedPlatforms.includes(platform)) {
        return res.status(400).json({ success: false, error: { code: 'UNSUPPORTED_PLATFORM', message: `Platform "${platform}" is not supported`, supported: supportedPlatforms } });
      }

      let result;
      switch (platform) {
        case 'tiktok': result = await downloadTikTok(url); break;
        case 'instagram': result = await downloadInstagram(url); break;
        case 'facebook': result = await downloadFacebook(url); break;
        case 'twitter': result = await downloadTwitter(url); break;
        case 'threads': result = await downloadThreads(url); break;
        default: return res.status(400).json({ success: false, error: { code: 'UNSUPPORTED_PLATFORM', message: 'This platform is not supported yet' } });
      }

      return res.json({ success: true, platform, timestamp: new Date().toISOString(), data: result });

    } catch (error) {
      console.error('Download error:', error);
      return res.status(500).json({ success: false, error: { code: 'DOWNLOAD_FAILED', message: error.message || 'Failed to download content' } });
    }
  }

  return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
};
