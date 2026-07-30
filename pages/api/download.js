/**
 * Next.js API Route - Social Media Downloader
 */

const cheerio = require('cheerio');
const { rateLimit } = require('../../lib/rateLimit');

const platformPatterns = {
  tiktok: /tiktok\.com|vm\.tiktok\.com/i,
  instagram: /instagram\.com/i,
  facebook: /facebook\.com|fb\.watch/i,
  twitter: /twitter\.com|x\.com/i,
  threads: /threads\.net|threads\.com/i,
  youtube: /youtube\.com|youtu\.be|youtube-nocookie\.com/i,
  pinterest: /pinterest\.com|pin\.it/i,
  capcut: /capcut\.com/i
};

function detectPlatform(url) {
  for (const [p, r] of Object.entries(platformPatterns)) {
    if (r.test(url)) return p;
  }
  return null;
}

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    body: new URLSearchParams({ url: url.trim(), hd: '1' })
  });

  const result = await response.json();
  if (result.code !== 0) throw new Error(result.msg || 'TikWM failed');

  const d = result.data || {};
  const author = d.author || {};
  const nowm = [d.play, d.hdplay].map(absoluteTikwmUrl).filter(Boolean);
  const mp3 = [absoluteTikwmUrl(d.music)].filter(Boolean);
  const slides = Array.isArray(d.images) ? d.images.map(absoluteTikwmUrl).filter(Boolean) : [];
  
  return {
    id: String(d.id || generateId()),
    title: d.title || 'TikTok Video',
    author: { name: author.nickname || author.unique_id || 'TikTok User' },
    thumbnail: d.cover || '',
    media: slides.length > 0
      ? slides.map(url => ({ type: 'image', url, format: 'jpg' }))
      : [
          ...nowm.map(url => ({ type: 'video', quality: 'no-watermark', url, format: 'mp4' })),
          ...mp3.map(url => ({ type: 'audio', url, format: 'mp3' }))
        ],
    downloadUrl: nowm[1] || nowm[0] || slides[0] || null,
    source: 'tikwm'
  };
}

// ============================================
// INSTAGRAM - Robust Multi-Provider + Scraper (2026)
// ============================================
async function downloadInstagram(url) {
  const cleanUrl = url.split('?')[0].replace(/\/$/, '');

  // 1. Try multiple external APIs first (widely used public endpoints)
  const providers = [
    `https://widipe.com/igdl?url=${encodeURIComponent(cleanUrl)}`,
    `https://api.siputzx.my.id/api/d/ig?url=${encodeURIComponent(cleanUrl)}`,
    `https://api.fgmods.xyz/api/downloader/igdl?apikey=fgmods&url=${encodeURIComponent(cleanUrl)}`,
    `https://api.popcat.xyz/ig?url=${encodeURIComponent(cleanUrl)}`
  ];

  for (const apiUrl of providers) {
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
        },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) continue;

      const data = await response.json().catch(() => null);
      if (!data) continue;

      let resultMedia = [];

      const candidates = [];
      if (Array.isArray(data.result)) candidates.push(...data.result);
      if (Array.isArray(data.data)) candidates.push(...data.data);
      if (Array.isArray(data.medias)) candidates.push(...data.medias);
      if (data.video) candidates.push({ url: data.video });
      if (data.image) candidates.push({ url: data.image });

      for (let m of candidates) {
        const mediaUrl = m.url || m.video_url || m.image_url || m.video || m.image;
        if (!mediaUrl || typeof mediaUrl !== 'string') continue;

        const isVideo = mediaUrl.includes('.mp4');
        resultMedia.push({
          type: isVideo ? 'video' : 'image',
          url: mediaUrl,
          format: isVideo ? 'mp4' : 'jpg'
        });
      }

      if (resultMedia.length > 0) {
        const seen = new Set();
        resultMedia = resultMedia.filter(m => !seen.has(m.url) && seen.add(m.url));

        return {
          id: generateId(),
          title: data.title || data.caption || 'Instagram Media',
          author: { name: data.username || data.author || 'Instagram User' },
          thumbnail: resultMedia[0].url,
          media: resultMedia,
          downloadUrl: resultMedia[0].url,
          source: 'api-fallback'
        };
      }
    } catch (e) {}
  }

  // 2. DIRECT HTML SCRAPER FALLBACK
  try {
    const pageRes = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://www.instagram.com/'
      },
      redirect: 'follow'
    });

    const html = await pageRes.text();
    const $ = cheerio.load(html);

    let media = [];

    // Meta tags
    const ogVideo = $('meta[property="og:video"]').attr('content');
    if (ogVideo) media.push({ type: 'video', url: ogVideo, format: 'mp4' });

    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage && media.length === 0) media.push({ type: 'image', url: ogImage, format: 'jpg' });

    // Scripts for video_url + display_url
    const scriptContent = $('script').map((i, el) => $(el).html() || '').get().join(' ');

    const vMatch = scriptContent.match(/"video_url":"(https?:\\?\/\\?\/[^"]+\.mp4[^"]*)"/i);
    if (vMatch) {
      let v = vMatch[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/').replace(/\\/g, '');
      if (v.startsWith('//')) v = 'https:' + v;
      if (!media.some(m => m.url === v)) media.push({ type: 'video', url: v, format: 'mp4' });
    }

    const imgMatches = scriptContent.match(/"display_url":"(https?:\\?\/\\?\/[^"]+\.(?:jpg|jpeg|png)[^"]*)"/gi) || [];
    for (let raw of imgMatches) {
      const im = raw.match(/"display_url":"([^"]+)"/i);
      if (im) {
        let iurl = im[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/').replace(/\\/g, '');
        if (iurl.startsWith('//')) iurl = 'https:' + iurl;
        if (!media.some(m => m.url === iurl)) media.push({ type: 'image', url: iurl, format: 'jpg' });
      }
    }

    // Last resort: CDN images
    if (media.length === 0) {
      const imgs = html.match(/https?:\/\/[^"'\s>]+cdninstagram[^"'\s>]*\.(?:jpg|jpeg|png)[^"'\s>]*/gi) || [];
      const best = imgs.find(i => i.includes('cdninstagram') && !i.includes('150x150'));
      if (best) media.push({ type: 'image', url: best, format: 'jpg' });
    }

    if (media.length > 0) {
      const unique = Array.from(new Map(media.map(m => [m.url, m])).values());
      const titleEl = $('meta[property="og:title"]').attr('content') || $('title').text() || 'Instagram Media';
      return {
        id: generateId(),
        title: titleEl.replace(' • Instagram', '').trim(),
        author: { name: 'Instagram User' },
        thumbnail: unique[0].url,
        media: unique,
        downloadUrl: unique[0].url,
        source: 'direct-scraper'
      };
    }
  } catch (scraperErr) {
    console.error('[IG Scraper] Failed:', scraperErr.message);
  }

  throw new Error('Instagram gagal fetch. Pastikan link publik, tidak private, dan coba lagi nanti.');
}

// ============================================
// FACEBOOK - Extractor
// ============================================
async function downloadFacebook(url) {
  const response = await fetch(`https://api.vreden.my.id/api/fbdl?url=${encodeURIComponent(url)}`);
  const data = await response.json();
  if (!data || !data.result) throw new Error('Facebook media not found');

  const media = [
    { type: 'video', url: data.result.hd || data.result.sd, format: 'mp4', quality: 'hd' }
  ];

  return {
    id: generateId(),
    title: 'Facebook Video',
    author: { name: 'Facebook User' },
    thumbnail: media[0].url,
    media,
    downloadUrl: media[0].url,
    source: 'vreden'
  };
}

// ============================================
// TWITTER/X - Extractor
// ============================================
async function downloadTwitter(url) {
  const response = await fetch(`https://api.vreden.my.id/api/twitter?url=${encodeURIComponent(url)}`);
  const data = await response.json();
  if (!data || !data.result) throw new Error('Twitter media not found');

  const media = data.result.map(m => ({
    type: 'video',
    url: m.url,
    format: 'mp4',
    quality: m.quality
  }));

  return {
    id: generateId(),
    title: 'Twitter Video',
    author: { name: 'Twitter User' },
    thumbnail: media[0].url,
    media,
    downloadUrl: media[0].url,
    source: 'vreden'
  };
}

// ============================================
// YOUTUBE - Extractor
// ============================================
async function downloadYouTube(url) {
  const response = await fetch(`https://api.vreden.my.id/api/ytdl?url=${encodeURIComponent(url)}`);
  const data = await response.json();
  if (!data || !data.result) throw new Error('YouTube media not found');

  const media = [
    { type: 'video', url: data.result.video, format: 'mp4', quality: '720p' },
    { type: 'audio', url: data.result.audio, format: 'mp3', quality: '128kbps' }
  ];

  return {
    id: generateId(),
    title: data.result.title || 'YouTube Video',
    author: { name: 'YouTube' },
    thumbnail: data.result.thumbnail,
    media,
    downloadUrl: media[0].url,
    source: 'vreden'
  };
}

// ============================================
// PINTEREST - Anti-Pink Fixed Scraper
// ============================================
async function downloadPinterest(url) {
  let targetUrl = url;
  let pinId = '';
  
  try {
    const res = await fetch(url, { 
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    targetUrl = res.url;
    const idMatch = targetUrl.match(/pin\/(\d+)/);
    if (idMatch) pinId = idMatch[1];
  } catch (e) {}

  if (!pinId) {
    const idMatch = url.match(/pin\/(\d+)/);
    if (idMatch) pinId = idMatch[1];
  }

  const cleanPinUrl = pinId ? `https://www.pinterest.com/pin/${pinId}/` : targetUrl;

  const providers = [
    `https://widipe.com/pinterest?url=${encodeURIComponent(cleanPinUrl)}`,
    `https://api.vreden.my.id/api/pinterest?url=${encodeURIComponent(cleanPinUrl)}`
  ];

  for (const api of providers) {
    try {
      const res = await fetch(api, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      const result = data.result || data.data || data;
      
      if (!result) continue;
      const video = result.video || result.video_url || result.url_video;
      const image = result.image || result.image_url || result.url_image || result.images_orig?.url || result.images?.orig?.url;
      
      const isPlaceholder = image && (image.includes('logo') || image.includes('webapp') || image.includes('60x60') || image.includes('236x'));

      if ((video || image) && !isPlaceholder) {
        const media = [];
        if (video) media.push({ type: 'video', url: video, format: 'mp4', quality: 'hd' });
        if (image) media.push({ type: 'image', url: image, format: 'jpg' });

        return {
          id: pinId || generateId(),
          title: result.title || 'Pinterest Media',
          author: { name: 'Pinterest User' },
          thumbnail: image || '',
          media,
          downloadUrl: media[0].url,
          source: 'api-fallback'
        };
      }
    } catch (e) {}
  }

  // FINAL SCRAPER FALLBACK
  try {
    const pageRes = await fetch(cleanPinUrl, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html'
      }
    });
    const html = await pageRes.text();
    
    const images = html.match(/https:\/\/i\.pinimg\.com\/[a-zA-Z0-9\/._-]+\.(jpg|png|gif|jpeg)/g) || [];
    const validImages = images.filter(img => 
      (img.includes('/originals/') || img.includes('/736x/')) && 
      !img.includes('logo') && !img.includes('webapp') && !img.includes('avatar')
    );

    if (validImages.length > 0) {
      const imageToUse = validImages[0];
      const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1];
      return {
        id: pinId || generateId(),
        title: ogTitle || 'Pinterest Image',
        author: { name: 'Pinterest User' },
        thumbnail: imageToUse,
        media: [{ type: 'image', url: imageToUse, format: imageToUse.endsWith('.png') ? 'png' : 'jpg' }],
        downloadUrl: imageToUse,
        source: 'scraper-originals'
      };
    }
  } catch (e) {}

  throw new Error('Gagal mendapatkan media Pinterest. Link mungkin diproteksi.');
}

// ============================================
// CAPCUT - Extractor
// ============================================
async function downloadCapCut(url) {
  const response = await fetch(`https://api.vreden.my.id/api/capcut?url=${encodeURIComponent(url)}`);
  const data = await response.json();
  if (!data || !data.result) throw new Error('CapCut media not found');

  const media = [
    { type: 'video', url: data.result.video_url, format: 'mp4', quality: 'no-watermark' }
  ];

  return {
    id: generateId(),
    title: data.result.title || 'CapCut Video',
    author: { name: 'CapCut User' },
    thumbnail: data.result.thumbnail,
    media,
    downloadUrl: media[0].url,
    source: 'vreden'
  };
}

// ============================================
// API HANDLER
// ============================================
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    if (!rateLimit(req, res, { limit: 20, windowMs: 60_000, key: 'download' })) return;

    try {
      const { url, platform: platformParam } = req.body || {};
      if (!url) return res.status(400).json({ success: false, error: { message: 'URL is required' } });

      let platform = platformParam?.toLowerCase() || detectPlatform(url);
      if (!platform) return res.status(400).json({ success: false, error: { message: 'Platform not supported' } });

      let result;
      switch (platform) {
        case 'tiktok': result = await downloadTikTok(url); break;
        case 'instagram': result = await downloadInstagram(url); break;
        case 'facebook': result = await downloadFacebook(url); break;
        case 'twitter': result = await downloadTwitter(url); break;
        case 'youtube': result = await downloadYouTube(url); break;
        case 'pinterest': result = await downloadPinterest(url); break;
        case 'capcut': result = await downloadCapCut(url); break;
        default: throw new Error('Platform not supported');
      }

      return res.json({ success: true, platform, timestamp: new Date().toISOString(), data: result });

    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  return res.status(404).json({ success: false, error: { message: 'Not found' } });
}
