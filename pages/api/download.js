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
// TIKTOK - TikWM extractor
// ============================================
function formatDuration(seconds) {
  const total = Number(seconds || 0);
  if (!Number.isFinite(total)) return '0:00:00';
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function absoluteTikwmUrl(value) {
  if (!value) return null;
  try { return new URL(value, 'https://www.tikwm.com').toString(); }
  catch (_) { return null; }
}

async function downloadTikTok(url) {
  const response = await fetch('https://www.tikwm.com/api/', {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Origin': 'https://www.tikwm.com',
      'Referer': 'https://www.tikwm.com/'
    },
    body: new URLSearchParams({ url: url.trim(), hd: '1' })
  });

  if (!response.ok) throw new Error(`TikWM HTTP ${response.status}`);

  const result = await response.json();
  if (result.code !== 0) {
    throw new Error(result.msg || 'TikWM gagal mendapatkan data');
  }

  const d = result.data || {};
  const author = d.author || {};
  const nowm = [d.play, d.hdplay].map(absoluteTikwmUrl).filter(Boolean);
  const wm = [absoluteTikwmUrl(d.wmplay)].filter(Boolean);
  const mp3 = [absoluteTikwmUrl(d.music)].filter(Boolean);
  const slides = Array.isArray(d.images) ? d.images.map(absoluteTikwmUrl).filter(Boolean) : [];
  const isSlide = slides.length > 0;
  const primaryUrl = nowm[1] || nowm[0] || wm[0] || slides[0] || null;

  if (!primaryUrl) throw new Error('TikWM tidak mengembalikan URL media');

  return {
    id: String(d.id || generateId()),
    title: d.title || 'TikTok Video',
    author: {
      name: author.nickname || author.unique_id || 'TikTok User',
      uniqueId: author.unique_id || null,
      avatar: d.author?.avatar || ''
    },
    thumbnail: d.cover || '',
    media: isSlide
      ? slides.map(url => ({ type: 'image', url, format: 'jpg' }))
      : [
          ...nowm.map(url => ({ type: 'video', quality: 'no-watermark', url, format: 'mp4', watermark: false })),
          ...wm.map(url => ({ type: 'video', quality: 'watermark', url, format: 'mp4', watermark: true })),
          ...mp3.map(url => ({ type: 'audio', url, format: 'mp3' }))
        ],
    duration: formatDuration(d.duration),
    statistics: {
      views: Number(d.play_count || 0),
      likes: Number(d.digg_count || 0),
      bookmarks: Number(d.collect_count || 0),
      comments: Number(d.comment_count || 0),
      shares: Number(d.share_count || 0)
    },
    downloadUrl: primaryUrl,
    source: 'tikwm'
  };
}

// ============================================
// INSTAGRAM - Real Scraper
// ============================================
function snapSaveConvert(value, radix, target) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/'.split('');
  const from = chars.slice(0, radix);
  const to = chars.slice(0, target);
  let total = [...value].reverse().reduce((acc, char, index) => {
    const at = from.indexOf(char);
    return at === -1 ? acc : acc + at * Math.pow(radix, index);
  }, 0);
  let out = '';
  while (total > 0) {
    out = to[total % target] + out;
    total = (total - (total % target)) / target;
  }
  return out || '0';
}

function decodeSnapSave(encoded) {
  try {
    // matches: }("<packed>", <ignored>, "<alphabet>", <offsetCode>, <separatorIdx>, <ignored>)
    const match = encoded.match(/\}\("([^"]+)",\s*\d+,\s*"([^"]+)",\s*(\d+),\s*(\d+),\s*\d+\)/);
    if (!match) return '';

    const packed = match[1];
    const alphabet = match[2];
    const offsetCode = Number(match[3]);   // charCode offset  (SnapSave arg "t")
    const radix = Number(match[4]);        // numeral base     (SnapSave arg "e")
    const separator = alphabet[radix];     // separator char is alphabet[radix], NOT alphabet[offset]

    let result = '';
    for (let i = 0; i < packed.length; i++) {
      let part = '';
      while (i < packed.length && packed[i] !== separator) part += packed[i++];
      for (let j = 0; j < alphabet.length; j++) {
        part = part.split(alphabet[j]).join(String(j));
      }
      result += String.fromCharCode(Number(snapSaveConvert(part, radix, 10)) - offsetCode);
    }

    // SnapSave emits UTF-8 bytes as latin1 chars -> unescape/decodeURIComponent round-trip
    try { return decodeURIComponent(escape(result)); } catch (_) { return result; }
  } catch (_) { return ''; }
}

function extractSnapSaveJwt(link) {
  try {
    const token = new URL(link).searchParams.get('token');
    if (!token) return { url: '', filename: '' };
    const payload = token.split('.')[1];
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/') + '==', 'base64').toString();
    const data = JSON.parse(json);
    return { url: data.url || '', filename: data.filename || '' };
  } catch (_) { return { url: '', filename: '' }; }
}

const SNAPSAVE_UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

function normalizeInstagramUrl(raw) {
  const u = new URL(raw.trim());
  u.hostname = 'www.instagram.com';
  u.search = '';
  u.hash = '';
  // strip profile segment: /username/reel/CODE/ -> /reel/CODE/
  const m = u.pathname.match(/\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (m) {
    const kind = m[1].toLowerCase() === 'reels' ? 'reel' : m[1].toLowerCase();
    u.pathname = `/${kind}/${m[2]}/`;
  } else if (!u.pathname.endsWith('/')) {
    u.pathname += '/';
  }
  return u.toString();
}

async function callSnapSave(cleanUrl) {
  await fetch('https://snapsave.app/id', {
    headers: { 'User-Agent': SNAPSAVE_UA, 'Accept': 'text/html' }
  }).catch(() => {});

  const response = await fetch('https://snapsave.app/action.php?lang=id', {
    method: 'POST',
    headers: {
      'User-Agent': SNAPSAVE_UA,
      'Origin': 'https://snapsave.app',
      'Referer': 'https://snapsave.app/id',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': '*/*'
    },
    body: new URLSearchParams({ url: cleanUrl })
  });

  if (!response.ok) throw new Error(`SnapSave HTTP ${response.status}`);
  return decodeSnapSave(await response.text());
}

async function downloadInstagram(url) {
  if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(url)) {
    throw new Error('URL bukan link Instagram yang valid');
  }

  const cleanUrl = normalizeInstagramUrl(url);

  // SnapSave kadang gagal di percobaan pertama (rate limit / cold cache) -> retry
  let decoded = '';
  let lastUpstreamError = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 1200 * attempt));
    try {
      decoded = await callSnapSave(cleanUrl);
    } catch (e) {
      lastUpstreamError = e.message;
      continue;
    }
    if (!decoded) { lastUpstreamError = 'Gagal decode response SnapSave'; continue; }
    if (decoded.includes('d.rapidcdn.app')) break;

    // SnapSave mengembalikan halaman error, bukan media
    const alertMatch = decoded.match(/innerHTML\s*=\s*"(?:Error:\s*)?([^"]{0,160})"/);
    lastUpstreamError = alertMatch ? alertMatch[1].trim() : 'SnapSave tidak mengembalikan media';
    decoded = '';
  }

  if (!decoded) {
    throw new Error(`Instagram extractor gagal: ${lastUpstreamError || 'tidak ada respon media'}`);
  }

  const videoLinks = [...new Set(decoded.match(/https:\/\/d\.rapidcdn\.app\/v2\?token=[a-zA-Z0-9._-]+/g) || [])];
  const thumbLinks = [...new Set(decoded.match(/https:\/\/d\.rapidcdn\.app\/thumb\?token=[a-zA-Z0-9._-]+/g) || [])];
  const videos = [], images = [], thumbnails = [];

  for (const proxy of videoLinks) {
    const item = extractSnapSaveJwt(proxy);
    if (!item.url) continue;
    const source = `${item.url} ${item.filename}`.toLowerCase();
    if (source.includes('.mp4')) videos.push({ url: item.url, proxy });
    else if (/\.(jpg|jpeg|webp|png)/.test(source)) images.push({ url: item.url, proxy });
    else videos.push({ url: item.url, proxy });
  }
  for (const proxy of thumbLinks) {
    const item = extractSnapSaveJwt(proxy);
    if (item.url) thumbnails.push(item.url);
  }

  const unique = list => [...new Map(list.map(item => [item.url, item])).values()];
  const uniqueVideos = unique(videos);
  const uniqueImages = unique(images);
  const uniqueThumbs = [...new Set(thumbnails)];
  const total = uniqueVideos.length + uniqueImages.length;

  if (!total) {
    throw new Error('Media tidak ditemukan. Post mungkin private, sudah dihapus, atau hanya untuk close friends.');
  }

  const media = [
    ...uniqueVideos.map(item => ({ type: 'video', url: item.url, format: 'mp4', proxyUrl: item.proxy })),
    ...uniqueImages.map(item => ({ type: 'image', url: item.url, format: 'jpg', proxyUrl: item.proxy }))
  ];
  const first = media[0];

  return {
    id: cleanUrl.match(/\/(reel|p|tv)\/([^/]+)/i)?.[2] || generateId(),
    title: 'Instagram Media',
    author: { name: 'Instagram User', username: 'instagram_user' },
    type: total > 1 ? 'carousel' : first.type,
    thumbnail: uniqueThumbs[0] || '',
    media,
    downloadUrl: first.url,
    thumbnails: uniqueThumbs,
    totalMedia: total,
    source: 'snapsave'
  };
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
