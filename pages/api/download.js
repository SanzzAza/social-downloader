/**
 * Next.js API Route - Social Media Downloader
 * With improved scraping for real data
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

// ============================================
// TIKTOK - Real Scraper
// ============================================
async function downloadTikTok(url) {
  url = url.split('?')[0];
  
  try {
    // Fetch TikTok page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try to extract from og:meta tags
    let ogVideo = $('meta[property="og:video"]').attr('content');
    let ogTitle = $('meta[property="og:title"]').attr('content');
    let ogDescription = $('meta[property="og:description"]').attr('content');
    let ogImage = $('meta[property="og:image"]').attr('content');
    let ogUrl = $('meta[property="og:url"]').attr('content');

    // Extract video ID
    const videoIdMatch = url.match(/\/video\/(\d+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : generateId();

    // Try to find video data in script tags
    let videoUrl = ogVideo;
    let noWatermarkUrl = null;

    // Look for JSON data in script tags
    const scripts = $('script');
    for (const script of scripts) {
      const content = $(script).html();
      if (content && (content.includes('videoData') || content.includes('playAddr') || content.includes('downloadAddr'))) {
        // Try to find video URLs
        const playAddrMatch = content.match(/"playAddr":"([^"]+)"/);
        const downloadAddrMatch = content.match(/"downloadAddr":"([^"]+)"/);
        const vidMatch = content.match(/"video_id":"([^"]+)"/);
        
        if (playAddrMatch) {
          videoUrl = Buffer.from(playAddrMatch[1], 'base64').toString('utf-8') || playAddrMatch[1];
        }
        if (downloadAddrMatch) {
          noWatermarkUrl = Buffer.from(downloadAddrMatch[1], 'base64').toString('utf-8') || downloadAddrMatch[1];
        }
        if (vidMatch) {
          // Found video ID
        }
        
        // Also try direct string matching
        if (!videoUrl) {
          const directMatch = content.match(/(https:\/\/[^"']+\.mp4[^"']*)/);
          if (directMatch) {
            videoUrl = directMatch[1];
          }
        }
      }
    }

    // Clean URLs
    if (videoUrl) {
      videoUrl = videoUrl.replace(/\\u002F/g, '/').replace(/\\n/g, '').replace(/\\/g, '/').trim();
    }
    if (noWatermarkUrl) {
      noWatermarkUrl = noWatermarkUrl.replace(/\\u002F/g, '/').replace(/\\n/g, '').replace(/\\/g, '/').trim();
    }

    // If we found real video URL (not example.com)
    if (videoUrl && videoUrl.includes('.mp4') && !videoUrl.includes('example.com')) {
      return {
        id: videoId,
        title: ogTitle || ogDescription || 'TikTok Video',
        author: {
          name: ogTitle?.split(' - ')[0]?.replace('@', '') || 'TikTok User',
          uniqueId: ogTitle?.match(/@(\w+)/)?.[1] || 'user',
          avatar: ogImage || ''
        },
        thumbnail: ogImage || '',
        media: [
          {
            type: 'video',
            quality: '1080p',
            url: videoUrl,
            format: 'mp4',
            watermark: false
          }
        ],
        duration: null,
        statistics: {
          likes: 0,
          comments: 0,
          shares: 0
        },
        downloadUrl: videoUrl
      };
    }

    // If noWatermarkUrl found
    if (noWatermarkUrl && !noWatermarkUrl.includes('example.com')) {
      return {
        id: videoId,
        title: ogTitle || 'TikTok Video',
        author: { name: 'TikTok User', uniqueId: 'user', avatar: ogImage || '' },
        thumbnail: ogImage || '',
        media: [
          { type: 'video', quality: '720p', url: noWatermarkUrl, format: 'mp4', watermark: false },
          { type: 'video', quality: '480p', url: videoUrl || noWatermarkUrl, format: 'mp4', watermark: true }
        ],
        duration: null,
        statistics: { likes: 0, comments: 0, shares: 0 },
        downloadUrl: noWatermarkUrl
      };
    }

    throw new Error('No video found in page');
    
  } catch (error) {
    console.log('TikTok scrape error:', error.message);
    
    // Return mock with real-ish structure
    const videoId = url.match(/\/video\/(\d+)/)?.[1] || generateId();
    return {
      id: videoId,
      title: 'TikTok Video',
      author: { name: 'TikTok Creator', uniqueId: 'creator', avatar: '' },
      thumbnail: '',
      media: [],
      duration: null,
      statistics: { likes: 0, comments: 0, shares: 0 },
      downloadUrl: null,
      error: 'Video not found or unavailable. The video might be private, deleted, or region-restricted.'
    };
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
  const isStory = url.includes('/stories/');

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
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
    const ogDescription = $('meta[property="og:description"]').attr('content');

    // Extract username from og:title
    const username = ogTitle?.match(/@(\w+)/)?.[1] || ogDescription?.match(/@(\w+)/)?.[1] || 'instagram_user';

    const media = [];
    
    if (ogVideo) {
      media.push({
        type: 'video',
        quality: '1080p',
        url: ogVideo,
        format: 'mp4',
        thumbnail: ogImage
      });
    }
    
    if (ogImage) {
      media.push({
        type: 'image',
        url: ogImage,
        format: 'jpg'
      });
    }

    // Look for more media in JSON-LD
    const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd[1]);
        if (data.video) {
          media.unshift({
            type: 'video',
            quality: '1080p',
            url: data.video.contentUrl || data.video,
            format: 'mp4'
          });
        }
      } catch (e) {}
    }

    if (media.length > 0) {
      return {
        id: shortcode,
        shortcode: shortcode,
        title: ogTitle || `Instagram ${isReel ? 'Reel' : isTV ? 'IGTV' : 'Post'}`,
        author: { name: username, username: username, fullName: username, avatar: ogImage || '' },
        type: isReel ? 'reel' : isTV ? 'igtv' : isStory ? 'story' : 'post',
        thumbnail: ogImage || '',
        media: media,
        duration: null,
        likes: 0,
        downloadUrl: media[0]?.url || null
      };
    }

    throw new Error('No media found');
    
  } catch (error) {
    console.log('Instagram scrape error:', error.message);
    return {
      id: shortcode,
      shortcode: shortcode,
      title: `Instagram ${isReel ? 'Reel' : isTV ? 'IGTV' : 'Post'}`,
      author: { name: 'content_creator', username: 'content_creator', fullName: 'Content Creator', avatar: '' },
      type: isReel ? 'reel' : isTV ? 'igtv' : 'post',
      thumbnail: '',
      media: [],
      duration: null,
      likes: 0,
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
    const ogDescription = $('meta[property="og:description"]').attr('content');

    const videoUrl = ogVideoSecure || ogVideo;
    const videoId = url.match(/\/videos\/(\d+)/)?.[1] || url.match(/\/watch\?v=(\d+)/)?.[1] || generateId();

    if (videoUrl) {
      return {
        id: videoId,
        title: ogTitle || 'Facebook Video',
        description: ogDescription || '',
        author: { name: 'Facebook User', username: 'user' },
        thumbnail: ogImage || '',
        media: [
          { type: 'video', quality: '1080p', url: videoUrl, format: 'mp4' },
          { type: 'video', quality: '720p', url: videoUrl, format: 'mp4' }
        ],
        duration: null,
        views: 0,
        downloadUrl: videoUrl
      };
    }

    throw new Error('No video found');
    
  } catch (error) {
    console.log('Facebook scrape error:', error.message);
    return {
      id: generateId(),
      title: 'Facebook Video',
      description: 'Video content from Facebook',
      author: { name: 'Facebook Page', username: 'page' },
      thumbnail: '',
      media: [],
      duration: null,
      views: 0,
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
    const ogDescription = $('meta[property="og:description"]').attr('content');

    const tweetId = url.match(/\/status\/(\d+)/)?.[1] || generateId().slice(0, 10);
    const username = url.match(/twitter\.com\/([^\/]+)/)?.[1] || 'user';

    const media = [];
    const isVideo = !!(ogVideo || ogVideoSecure);

    if (ogVideo || ogVideoSecure) {
      media.push({
        type: 'video',
        quality: '720p',
        url: ogVideoSecure || ogVideo,
        format: 'mp4'
      });
    }
    
    if (ogImage) {
      media.push({
        type: 'image',
        url: ogImage,
        format: ogImage.includes('.png') ? 'png' : 'jpg'
      });
    }

    if (media.length > 0) {
      return {
        id: tweetId,
        tweetId: tweetId,
        title: ogTitle || `Tweet by @${username}`,
        author: { name: username, username: username, avatar: `https://twitter.com/${username}/photo.jpg` },
        thumbnail: ogImage || '',
        media: media,
        isVideo: isVideo,
        likes: 0,
        retweets: 0,
        url: url,
        downloadUrl: media[0]?.url || null
      };
    }

    throw new Error('No media found');
    
  } catch (error) {
    console.log('Twitter scrape error:', error.message);
    return {
      id: generateId().slice(0, 10),
      tweetId: generateId().slice(0, 10),
      title: `Tweet by @${url.match(/twitter\.com\/([^\/]+)/)?.[1] || 'user'}`,
      author: { name: 'twitter_user', username: 'twitter_user', avatar: '' },
      thumbnail: '',
      media: [],
      isVideo: false,
      likes: 0,
      retweets: 0,
      url: url,
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
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
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
    const isVideo = !!(ogVideo || ogVideoSecure);

    if (ogVideo || ogVideoSecure) {
      media.push({
        type: 'video',
        quality: '720p',
        url: ogVideoSecure || ogVideo,
        format: 'mp4',
        thumbnail: ogImage
      });
    }
    
    if (ogImage && media.length === 0) {
      media.push({
        type: 'image',
        url: ogImage,
        format: 'jpg'
      });
    }

    if (media.length > 0) {
      return {
        id: postId,
        postId: postId,
        title: ogTitle || `Threads post by @${username}`,
        author: { name: username, username: username, fullName: username },
        thumbnail: ogImage || '',
        media: media,
        isVideo: isVideo,
        url: url,
        downloadUrl: media[0]?.url || null
      };
    }

    throw new Error('No media found');
    
  } catch (error) {
    console.log('Threads scrape error:', error.message);
    return {
      id: generateId().slice(0, 12),
      postId: generateId().slice(0, 12),
      title: 'Threads post',
      author: { name: 'threads_user', username: 'threads_user', fullName: 'Threads User' },
      thumbnail: '',
      media: [],
      isVideo: false,
      url: url,
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
  if (req.method === 'GET' && (req.url === '/api' || req.url === '/api/health' || req.url === '/')) {
    return res.json({ 
      success: true, 
      status: 'healthy', 
      timestamp: new Date().toISOString(), 
      version: '1.0.0',
      message: 'Social Media Downloader API - Real scraping enabled'
    });
  }

  // Platforms list
  if (req.method === 'GET' && req.url === '/api/platforms') {
    return res.json({
      success: true,
      platforms: [
        { name: 'TikTok', slug: 'tiktok', patterns: ['tiktok.com', 'vm.tiktok.com'], features: ['Video', 'Real Data'] },
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
            error: { code: 'UNKNOWN_PLATFORM', message: 'Could not detect platform from URL', supported: ['tiktok', 'instagram', 'facebook', 'twitter', 'threads'] }
          });
        }
      }

      const supportedPlatforms = ['tiktok', 'instagram', 'facebook', 'twitter', 'threads'];
      if (!supportedPlatforms.includes(platform)) {
        return res.status(400).json({ success: false, error: { code: 'UNSUPPORTED_PLATFORM', message: `Platform "${platform}" not supported`, supported: supportedPlatforms } });
      }

      let result;
      switch (platform) {
        case 'tiktok': result = await downloadTikTok(url); break;
        case 'instagram': result = await downloadInstagram(url); break;
        case 'facebook': result = await downloadFacebook(url); break;
        case 'twitter': result = await downloadTwitter(url); break;
        case 'threads': result = await downloadThreads(url); break;
        default: return res.status(400).json({ success: false, error: { code: 'UNSUPPORTED_PLATFORM', message: 'Not supported' } });
      }

      return res.json({ success: true, platform, timestamp: new Date().toISOString(), data: result });

    } catch (error) {
      console.error('Download error:', error);
      return res.status(500).json({ success: false, error: { code: 'DOWNLOAD_FAILED', message: error.message } });
    }
  }

  return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
}
