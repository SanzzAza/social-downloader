/**
 * Next.js API Route - Social Media Downloader
 * With proper URL decoding for TikTok
 */

const cheerio = require('cheerio');

const platformPatterns = {
  tiktok: /tiktok\.com|vm\.tiktok\.com/i,
  instagram: /instagram\.com/i,
  facebook: /facebook\.com|fb\.watch/i,
  twitter: /twitter\.com|x\.com/i,
  threads: /threads\.net|threads\.com/i
};

function detectPlatform(url) {
  for (const [p, r] of Object.entries(platformPatterns)) {
    if (r.test(url)) return p;
  }
  return null;
}

function isValidUrl(string) {
  try { new URL(string); return true; } catch (_) { return false; }
}

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Clean TikTok URL - decode properly
function cleanTikTokUrl(url) {
  if (!url) return null;
  
  // Remove null bytes and control characters
  let cleaned = url.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  // Try to decode base64 if it looks like it
  try {
    // Check if it's URL-safe base64
    if (cleaned.includes('_') || cleaned.includes('-')) {
      // URL-safe base64 to standard base64
      cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');
    }
    
    // Check if it's valid URL after basic cleanup
    if (cleaned.startsWith('http') && cleaned.includes('.mp4')) {
      return cleaned.split('?')[0]; // Take only URL part before query
    }
  } catch (e) {}
  
  // If still not valid, return null
  if (!cleaned.startsWith('http')) return null;
  
  return cleaned.split('?')[0];
}

// ============================================
// TIKTOK - Real Scraper with proper decoding
// ============================================
function parseEmbeddedJson(html, id) {
  const re = new RegExp(`<script[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)</script>`, 'i');
  const match = html.match(re);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch (_) { return null; }
}

function findTikTokItem(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.itemInfo?.itemStruct) return value.itemInfo.itemStruct;
  if (value.itemStruct?.video || value.itemStruct?.stats) return value.itemStruct;
  for (const child of Object.values(value)) {
    const found = findTikTokItem(child);
    if (found) return found;
  }
  return null;
}

function decodeTikTokValue(value) {
  if (!value) return '';
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/\\u002F/g, '/')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003D/g, '=')
    .replace(/\\u0025/g, '%');
}

async function downloadTikTok(url) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) throw new Error(`TikTok HTTP ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);
    const universal = parseEmbeddedJson(html, '__UNIVERSAL_DATA_FOR_REHYDRATION__');
    const sigi = parseEmbeddedJson(html, 'SIGI_STATE');
    const item = findTikTokItem(universal) || findTikTokItem(sigi);
    const video = item?.video || {};
    const author = item?.author || {};
    const stats = item?.stats || {};

    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const videoUrl = decodeTikTokValue(video.playAddr || video.downloadAddr);
    const thumbnail = decodeTikTokValue(video.cover || video.originCover || ogImage);

    if (!item || !videoUrl.startsWith('http')) {
      throw new Error('TikTok HTML tidak berisi data video yang bisa diputar');
    }

    return {
      id: item.id || url.match(/\/video\/(\d+)/)?.[1] || generateId(),
      title: item.desc || ogTitle || 'TikTok Video',
      author: {
        name: author.nickname || author.uniqueId || 'TikTok User',
        uniqueId: author.uniqueId || null,
        avatar: author.avatarLarger || author.avatarMedium || ''
      },
      thumbnail,
      media: [{ type: 'video', quality: 'original', url: videoUrl, format: 'mp4', watermark: false }],
      duration: video.duration || null,
      statistics: {
        views: Number(stats.playCount || 0),
        likes: Number(stats.diggCount || 0),
        bookmarks: Number(stats.collectCount || 0),
        comments: Number(stats.commentCount || 0),
        shares: Number(stats.shareCount || 0)
      },
      downloadUrl: videoUrl,
      source: 'tiktok_html'
    };
  } catch (error) {
    console.error('TikTok error:', error.message);
    throw new Error(`TikTok extraction failed: ${error.message}`);
  }
}

// ============================================
// INSTAGRAM - Real Scraper
// ============================================
async function downloadInstagram(url) {
  url = url.split('?')[0];
  const shortcode = url.match(/\/(reel|tv|p|stories)\/([A-Za-z0-9_-]+)/)?.[2] || generateId().slice(0, 11);
  const isReel = url.includes('/reel/');
  const isTV = url.includes('/tv/');

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    const ogVideo = $('meta[property="og:video"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogTitle = $('meta[property="og:title"]').attr('content');

    const username = ogTitle?.match(/@(\w+)/)?.[1] || 'instagram_user';
    const media = [];
    
    if (ogVideo && ogVideo.startsWith('http')) {
      media.push({
        type: 'video',
        quality: '1080p',
        url: ogVideo.split('?')[0],
        format: 'mp4',
        thumbnail: ogImage
      });
    }
    
    if (ogImage && ogImage.startsWith('http')) {
      media.push({
        type: 'image',
        url: ogImage.split('?')[0],
        format: 'jpg'
      });
    }

    if (media.length > 0) {
      return {
        id: shortcode,
        shortcode: shortcode,
        title: ogTitle || `Instagram ${isReel ? 'Reel' : isTV ? 'IGTV' : 'Post'}`,
        author: { name: username, username: username, fullName: username },
        type: isReel ? 'reel' : isTV ? 'igtv' : 'post',
        thumbnail: ogImage || '',
        media: media,
        downloadUrl: media[0]?.url || null,
        source: 'instagram_og'
      };
    }

    throw new Error('No media found');
    
  } catch (error) {
    console.log('Instagram error:', error.message);
    return {
      id: shortcode,
      shortcode: shortcode,
      title: `Instagram ${isReel ? 'Reel' : isTV ? 'IGTV' : 'Post'}`,
      author: { name: 'content_creator', username: 'content_creator' },
      type: isReel ? 'reel' : isTV ? 'igtv' : 'post',
      media: [],
      downloadUrl: null,
      error: 'Media not found or unavailable'
    };
  }
}

// ============================================
// FACEBOOK - Real Scraper
// ============================================
async function downloadFacebook(url) {
  url = url.split('?')[0];

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    const ogVideo = $('meta[property="og:video"]').attr('content');
    const ogVideoSecure = $('meta[property="og:video:secure_url"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogTitle = $('meta[property="og:title"]').attr('content');

    const videoUrl = ogVideoSecure || ogVideo;
    const videoId = url.match(/\/videos\/(\d+)/)?.[1] || url.match(/\/watch\?v=(\d+)/)?.[1] || generateId();

    if (videoUrl && videoUrl.startsWith('http')) {
      return {
        id: videoId,
        title: ogTitle || 'Facebook Video',
        author: { name: 'Facebook User', username: 'user' },
        thumbnail: ogImage || '',
        media: [
          { type: 'video', quality: '1080p', url: videoUrl.split('?')[0], format: 'mp4' }
        ],
        downloadUrl: videoUrl.split('?')[0],
        source: 'facebook_og'
      };
    }

    throw new Error('No video found');
    
  } catch (error) {
    console.log('Facebook error:', error.message);
    return {
      id: generateId(),
      title: 'Facebook Video',
      media: [],
      downloadUrl: null,
      error: 'Video not found or unavailable'
    };
  }
}

// ============================================
// TWITTER/X - Real Scraper
// ============================================
async function downloadTwitter(url) {
  url = url.replace('x.com', 'twitter.com').split('?')[0];

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    const ogVideo = $('meta[property="og:video"]').attr('content');
    const ogVideoSecure = $('meta[property="og:video:secure_url"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogTitle = $('meta[property="og:title"]').attr('content');

    const tweetId = url.match(/\/status\/(\d+)/)?.[1] || generateId().slice(0, 10);
    const username = url.match(/twitter\.com\/([^\/]+)/)?.[1] || 'user';

    const media = [];

    if (ogVideo || ogVideoSecure) {
      const videoUrl = ogVideoSecure || ogVideo;
      if (videoUrl.startsWith('http')) {
        media.push({
          type: 'video',
          quality: '720p',
          url: videoUrl.split('?')[0],
          format: 'mp4'
        });
      }
    }
    
    if (ogImage && ogImage.startsWith('http')) {
      media.push({
        type: 'image',
        url: ogImage.split('?')[0],
        format: ogImage.includes('.png') ? 'png' : 'jpg'
      });
    }

    if (media.length > 0) {
      return {
        id: tweetId,
        tweetId: tweetId,
        title: ogTitle || `Tweet by @${username}`,
        author: { name: username, username: username },
        media: media,
        isVideo: !!(ogVideo || ogVideoSecure),
        url: url,
        downloadUrl: media[0]?.url || null,
        source: 'twitter_og'
      };
    }

    throw new Error('No media found');
    
  } catch (error) {
    console.log('Twitter error:', error.message);
    return {
      id: generateId().slice(0, 10),
      title: `Tweet by @${url.match(/twitter\.com\/([^\/]+)/)?.[1] || 'user'}`,
      media: [],
      downloadUrl: null,
      error: 'Media not found or unavailable'
    };
  }
}

// ============================================
// THREADS - Real Scraper
// ============================================
async function downloadThreads(url) {
  url = url.split('?')[0];

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    const ogVideo = $('meta[property="og:video"]').attr('content');
    const ogVideoSecure = $('meta[property="og:video:secure_url"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogTitle = $('meta[property="og:title"]').attr('content');

    const postId = url.match(/\/post\/(\d+)/)?.[1] || generateId().slice(0, 12);
    const username = url.match(/threads\.net\/@([^\/]+)/)?.[1] || 'threads_user';

    const media = [];
    const videoUrl = ogVideoSecure || ogVideo;

    if (videoUrl && videoUrl.startsWith('http')) {
      media.push({
        type: 'video',
        quality: '720p',
        url: videoUrl.split('?')[0],
        format: 'mp4',
        thumbnail: ogImage
      });
    }
    
    if (ogImage && ogImage.startsWith('http') && media.length === 0) {
      media.push({
        type: 'image',
        url: ogImage.split('?')[0],
        format: 'jpg'
      });
    }

    if (media.length > 0) {
      return {
        id: postId,
        postId: postId,
        title: ogTitle || `Threads post by @${username}`,
        author: { name: username, username: username, fullName: username },
        media: media,
        url: url,
        downloadUrl: media[0]?.url || null,
        source: 'threads_og'
      };
    }

    throw new Error('No media found');
    
  } catch (error) {
    console.log('Threads error:', error.message);
    return {
      id: generateId().slice(0, 12),
      title: 'Threads post',
      media: [],
      downloadUrl: null,
      error: 'Media not found or unavailable'
    };
  }
}

// ============================================
// API HANDLER
// ============================================
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Health check
  if (req.method === 'GET' && (req.url === '/api' || req.url === '/api/health')) {
    return res.json({ 
      success: true, 
      status: 'healthy', 
      timestamp: new Date().toISOString(), 
      version: '1.1.0'
    });
  }

  // Platforms list
  if (req.method === 'GET' && req.url === '/api/platforms') {
    return res.json({
      success: true,
      platforms: [
        { name: 'TikTok', slug: 'tiktok', patterns: ['tiktok.com', 'vm.tiktok.com'] },
        { name: 'Instagram', slug: 'instagram', patterns: ['instagram.com'] },
        { name: 'Facebook', slug: 'facebook', patterns: ['facebook.com', 'fb.watch'] },
        { name: 'Twitter/X', slug: 'twitter', patterns: ['twitter.com', 'x.com'] },
        { name: 'Threads', slug: 'threads', patterns: ['threads.net', 'threads.com'] }
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
            error: { code: 'UNKNOWN_PLATFORM', message: 'Could not detect platform', supported: ['tiktok', 'instagram', 'facebook', 'twitter', 'threads'] }
          });
        }
      }

      const supportedPlatforms = ['tiktok', 'instagram', 'facebook', 'twitter', 'threads'];
      if (!supportedPlatforms.includes(platform)) {
        return res.status(400).json({ success: false, error: { code: 'UNSUPPORTED_PLATFORM', message: `Platform "${platform}" not supported` } });
      }

      let result;
      switch (platform) {
        case 'tiktok': result = await downloadTikTok(url); break;
        case 'instagram': result = await downloadInstagram(url); break;
        case 'facebook': result = await downloadFacebook(url); break;
        case 'twitter': result = await downloadTwitter(url); break;
        case 'threads': result = await downloadThreads(url); break;
        default: throw new Error('Not supported');
      }

      return res.json({ success: true, platform, timestamp: new Date().toISOString(), data: result });

    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ success: false, error: { code: 'DOWNLOAD_FAILED', message: error.message } });
    }
  }

  return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
}
