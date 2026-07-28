/**
 * Next.js API Route - Social Media Downloader
 * With proper URL decoding for TikTok
 */

const cheerio = require('cheerio');
const { rateLimit } = require('../../lib/rateLimit');

const platformPatterns = {
  tiktok: /tiktok\.com|vm\.tiktok\.com/i,
  instagram: /instagram\.com/i,
  facebook: /facebook\.com|fb\.watch/i,
  twitter: /twitter\.com|x\.com/i,
  threads: /threads\.net|threads\.com/i,
  youtube: /youtube\.com|youtu\.be|youtube-nocookie\.com/i
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

function collectSnapSaveMedia(decoded) {
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

  const unique = list => [...new Map(list.map(i => [i.url, i])).values()];
  return {
    videos: unique(videos),
    images: unique(images),
    thumbnails: [...new Set(thumbnails)]
  };
}

// Runs SnapSave with retry; returns decoded payload containing media links.
async function snapSaveExtract(cleanUrl, label) {
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
    if (decoded.includes('d.rapidcdn.app')) return decoded;

    const alertMatch = decoded.match(/innerHTML\s*=\s*"(?:Error:\s*)?([^"]{0,160})"/);
    lastUpstreamError = alertMatch ? alertMatch[1].trim() : 'SnapSave tidak mengembalikan media';
    decoded = '';
  }
  throw new Error(`${label} extractor gagal: ${lastUpstreamError || 'tidak ada respon media'}`);
}

// ---- DownloadGram: independent fallback provider for Instagram ----
// Returns the same { videos, images, thumbnails } shape as collectSnapSaveMedia
// so callers can treat both providers identically.
async function downloadGramExtract(cleanUrl) {
  const response = await fetch('https://api.downloadgram.org/media', {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'https://downloadgram.org',
      'Referer': 'https://downloadgram.org/'
    },
    body: new URLSearchParams({ url: cleanUrl })
  });

  if (!response.ok) throw new Error(`DownloadGram HTTP ${response.status}`);

  // Body is JavaScript with \xNN-escaped HTML embedded in it.
  const raw = (await response.text()).replace(
    /\\x([0-9a-fA-F]{2})/g,
    (_, hex) => String.fromCharCode(parseInt(hex, 16))
  );

  const tokens = [...new Set(raw.match(/token=([A-Za-z0-9._-]+)/g) || [])]
    .map(entry => entry.slice(6));

  const videos = [], images = [], thumbnails = [];

  for (const token of tokens) {
    let payload;
    try {
      const body = token.split('.')[1];
      payload = JSON.parse(
        Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/') + '==', 'base64').toString()
      );
    } catch (_) { continue; }

    const mediaUrl = payload && payload.url;
    if (!mediaUrl) continue;

    const proxy = `https://cdn.downloadgram.org/?token=${token}`;
    const hint = `${mediaUrl} ${payload.filename || ''}`.toLowerCase();

    if (/\.mp4|\/o1\/v\//.test(hint)) {
      videos.push({ url: mediaUrl, proxy });
    } else if (/\.(jpg|jpeg|webp|png)/.test(hint)) {
      images.push({ url: mediaUrl, proxy });
      thumbnails.push(mediaUrl);
    }
  }

  if (!videos.length && !images.length) {
    throw new Error('DownloadGram tidak mengembalikan media');
  }

  // A still returned alongside a video is the cover, not a carousel item.
  if (videos.length) {
    return { videos, images: [], thumbnails: [...new Set(thumbnails)] };
  }
  return { videos, images, thumbnails: [...new Set(thumbnails)] };
}

async function downloadInstagram(url) {
  if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(url)) {
    throw new Error('URL bukan link Instagram yang valid');
  }

  const cleanUrl = normalizeInstagramUrl(url);

  // Try providers in order so one outage does not take Instagram down.
  const providers = [
    {
      name: 'snapsave',
      run: async () => collectSnapSaveMedia(await snapSaveExtract(cleanUrl, 'Instagram'))
    },
    {
      name: 'downloadgram',
      run: () => downloadGramExtract(cleanUrl)
    }
  ];

  const failures = [];
  let extracted = null;
  let source = '';

  for (const provider of providers) {
    try {
      const media = await provider.run();
      if (media.videos.length || media.images.length) {
        extracted = media;
        source = provider.name;
        break;
      }
      failures.push(`${provider.name}: tidak ada media`);
    } catch (error) {
      failures.push(`${provider.name}: ${error.message}`);
    }
  }

  if (!extracted) {
    throw new Error(
      `Media tidak ditemukan. Post mungkin private, dihapus, atau khusus close friends. (${failures.join(' | ')})`
    );
  }

  const { videos, images, thumbnails } = extracted;
  const total = videos.length + images.length;

  const media = [
    ...videos.map(i => ({ type: 'video', url: i.url, format: 'mp4', proxyUrl: i.proxy })),
    ...images.map(i => ({ type: 'image', url: i.url, format: 'jpg', proxyUrl: i.proxy }))
  ];

  return {
    id: cleanUrl.match(/\/(reel|p|tv)\/([^/]+)/i)?.[2] || generateId(),
    title: 'Instagram Media',
    author: { name: 'Instagram User', username: 'instagram_user' },
    type: total > 1 ? 'carousel' : media[0].type,
    thumbnail: thumbnails[0] || '',
    media,
    downloadUrl: media[0].url,
    thumbnails,
    totalMedia: total,
    source
  };
}

// ============================================
// FACEBOOK - Real Scraper
// ============================================
async function downloadFacebook(url) {
  if (!/facebook\.com|fb\.watch/i.test(url)) {
    throw new Error('URL bukan link Facebook yang valid');
  }

  // Direct og:video scraping returns HTTP 400 for share/reel links and hits a
  // login wall otherwise, so go through SnapSave like Instagram does.
  const cleanUrl = url.trim().split('?')[0];
  const decoded = await snapSaveExtract(cleanUrl, 'Facebook');
  const { videos, images, thumbnails } = collectSnapSaveMedia(decoded);
  const total = videos.length + images.length;

  if (!total) {
    throw new Error('Media tidak ditemukan. Video mungkin private, sudah dihapus, atau dibatasi wilayah.');
  }

  // SnapSave lists HD first, then SD
  const media = [
    ...videos.map((i, idx) => ({
      type: 'video',
      quality: idx === 0 ? 'hd' : 'sd',
      url: i.url,
      format: 'mp4',
      proxyUrl: i.proxy
    })),
    ...images.map(i => ({ type: 'image', url: i.url, format: 'jpg', proxyUrl: i.proxy }))
  ];

  const id = url.match(/\/videos\/(\d+)/)?.[1]
    || url.match(/[?&]v=(\d+)/)?.[1]
    || url.match(/\/(?:share\/[rv]|reel)\/([A-Za-z0-9_-]+)/)?.[1]
    || generateId();

  return {
    id: String(id),
    title: 'Facebook Video',
    author: { name: 'Facebook User', username: 'facebook_user' },
    type: media[0].type,
    thumbnail: thumbnails[0] || '',
    media,
    downloadUrl: media[0].url,
    thumbnails,
    totalMedia: total,
    source: 'snapsave'
  };
}

// ============================================
// TWITTER/X - Real Scraper
// ============================================
// Twitter's syndication endpoint needs a token derived from the tweet id.
function twitterSyndicationToken(id) {
  return ((Number(id) / 1e15) * Math.PI)
    .toString(36)
    .replace(/(0+|\.)/g, '');
}

async function downloadTwitter(url) {
  const tweetId = url.match(/\/status(?:es)?\/(\d+)/)?.[1];
  if (!tweetId) throw new Error('Tidak menemukan tweet ID pada URL');

  // Scraping twitter.com/x.com HTML is unreliable: it is behind a login wall and
  // returns og: tags for an unrelated tweet. The syndication endpoint is the
  // same one the official embed widget uses and returns proper JSON.
  const endpoint = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}`
    + `&token=${twitterSyndicationToken(tweetId)}&lang=en`;

  const response = await fetch(endpoint, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    }
  });

  if (response.status === 404) throw new Error('Tweet tidak ditemukan, sudah dihapus, atau akun private');
  if (!response.ok) throw new Error(`Twitter syndication HTTP ${response.status}`);

  let data;
  try { data = await response.json(); }
  catch (_) { throw new Error('Response Twitter tidak valid'); }

  if (!data || !data.user) throw new Error('Tweet tidak ditemukan atau akun private');

  const details = data.mediaDetails || [];
  const media = [];

  for (const item of details) {
    if (item.video_info) {
      const variants = (item.video_info.variants || [])
        .filter(v => v.content_type === 'video/mp4')
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      if (variants.length) {
        media.push({
          type: item.type === 'animated_gif' ? 'gif' : 'video',
          quality: variants[0].bitrate ? `${Math.round(variants[0].bitrate / 1000)}kbps` : 'best',
          url: variants[0].url,
          format: 'mp4',
          thumbnail: item.media_url_https || ''
        });
      }
    } else if (item.media_url_https) {
      media.push({
        type: 'image',
        url: `${item.media_url_https}?name=orig`,
        format: item.media_url_https.endsWith('.png') ? 'png' : 'jpg'
      });
    }
  }

  if (!media.length) throw new Error('Tweet ini tidak memiliki media (foto/video)');

  return {
    id: tweetId,
    tweetId,
    title: data.text || `Tweet by @${data.user.screen_name}`,
    author: {
      name: data.user.name || data.user.screen_name,
      username: data.user.screen_name,
      avatar: data.user.profile_image_url_https || ''
    },
    type: media[0].type,
    thumbnail: media[0].thumbnail || media[0].url,
    media,
    isVideo: media.some(m => m.type === 'video' || m.type === 'gif'),
    url,
    downloadUrl: media[0].url,
    totalMedia: media.length,
    source: 'twitter_syndication'
  };
}

// ============================================
// THREADS - Real Scraper
// ============================================
async function downloadThreads(url) {
  const cleanUrl = url.trim().split('?')[0];

  // Threads serves og: meta tags only to crawler user-agents; a normal browser
  // UA gets the empty JS shell (which is why this used to return "Threads - Log in").
  const response = await fetch(cleanUrl, {
    headers: {
      'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });

  if (!response.ok) throw new Error(`Threads HTTP ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);

  const ogTitle = $('meta[property="og:title"]').attr('content') || '';
  const ogImage = $('meta[property="og:image"]').attr('content');
  const ogVideo = $('meta[property="og:video:secure_url"]').attr('content')
    || $('meta[property="og:video"]').attr('content');
  const ogDesc = $('meta[property="og:description"]').attr('content') || '';

  if (!ogTitle && !ogImage) {
    throw new Error('Post tidak ditemukan, sudah dihapus, atau akun private');
  }

  const postId = cleanUrl.match(/\/post\/([A-Za-z0-9_-]+)/)?.[1] || generateId().slice(0, 12);
  const username = cleanUrl.match(/threads\.(?:net|com)\/@([^/]+)/)?.[1] || 'threads_user';

  const media = [];
  if (ogVideo && ogVideo.startsWith('http')) {
    media.push({ type: 'video', url: ogVideo, format: 'mp4', thumbnail: ogImage || '' });
  }
  if (ogImage && ogImage.startsWith('http')) {
    media.push({ type: 'image', url: ogImage, format: 'jpg' });
  }

  if (!media.length) throw new Error('Post ini tidak memiliki media (foto/video)');

  return {
    id: postId,
    postId,
    title: ogDesc || ogTitle || `Threads post by @${username}`,
    author: { name: username, username, fullName: ogTitle.split('(')[0].trim() || username },
    type: media[0].type,
    thumbnail: ogImage || '',
    media,
    url: cleanUrl,
    downloadUrl: media[0].url,
    totalMedia: media.length,
    source: 'threads_og'
  };
}

// ============================================
// YOUTUBE - InnerTube (mp4 + mp3)
// ============================================
function parseYouTubeId(url) {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;

    const v = u.searchParams.get('v');
    if (v) return v;

    // /shorts/<id>, /embed/<id>, /live/<id>, /v/<id>
    const m = u.pathname.match(/\/(shorts|embed|live|v)\/([A-Za-z0-9_-]{6,})/);
    if (m) return m[2];

    return null;
  } catch (_) { return null; }
}

function humanSize(bytes) {
  const n = Number(bytes || 0);
  if (!n) return '';
  if (n >= 1024 * 1024 * 1024) return `${(n / 1073741824).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${Math.round(n / 1048576)} MB`;
  return `${Math.round(n / 1024)} KB`;
}

// YouTube blocks datacenter IPs: calling InnerTube (or scraping the watch
// page) straight from a serverless host answers LOGIN_REQUIRED with
// "Sign in to confirm you're not a bot", no matter which client is used.
// loader.to does the extraction from its own infrastructure and serves the
// finished file from its CDN, which sidesteps the block entirely and also
// gives real MP3 and resolutions above 360p.
const LOADER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// format token -> how it should be presented
const YOUTUBE_FORMATS = [
  { token: '720', type: 'video', quality: '720p', format: 'mp4' },
  { token: '360', type: 'video', quality: '360p', format: 'mp4' },
  { token: 'mp3', type: 'audio', quality: '128kbps', format: 'mp3' }
];

async function loaderToJob(url, formatToken) {
  const start = await fetch(
    `https://loader.to/ajax/download.php?format=${formatToken}&url=${encodeURIComponent(url)}`,
    { headers: { 'User-Agent': LOADER_UA, 'Accept': 'application/json' } }
  );

  if (!start.ok) throw new Error(`loader.to HTTP ${start.status}`);

  const job = await start.json();
  if (!job.success || !job.progress_url) {
    throw new Error(job.text || job.message || 'loader.to menolak permintaan');
  }
  return job;
}

// Conversion is async: poll until a download_url appears.
async function loaderToWait(job, { attempts = 12, delayMs = 2500 } = {}) {
  for (let i = 0; i < attempts; i++) {
    await new Promise(r => setTimeout(r, delayMs));

    let progress;
    try {
      const res = await fetch(job.progress_url, {
        headers: { 'User-Agent': LOADER_UA, 'Accept': 'application/json' }
      });
      if (!res.ok) continue;
      progress = await res.json();
    } catch (_) { continue; }

    if (progress.download_url) return progress.download_url;
    if (progress.text && /error|fail|unavailable/i.test(progress.text)) {
      throw new Error(progress.text);
    }
  }
  throw new Error('Konversi terlalu lama, coba lagi sebentar');
}

async function downloadYouTube(url) {
  const videoId = parseYouTubeId(url);
  if (!videoId) throw new Error('Tidak menemukan ID video pada link YouTube');

  const canonical = `https://www.youtube.com/watch?v=${videoId}`;

  // Kick off every format at once, then wait, so the user is not billed
  // three sequential conversions worth of latency.
  const jobs = await Promise.allSettled(
    YOUTUBE_FORMATS.map(async spec => ({
      spec,
      job: await loaderToJob(canonical, spec.token)
    }))
  );

  const started = jobs.filter(j => j.status === 'fulfilled').map(j => j.value);
  if (!started.length) {
    const why = jobs.find(j => j.status === 'rejected')?.reason?.message || 'tidak diketahui';
    throw new Error(`Gagal memproses video YouTube: ${why}`);
  }

  const settled = await Promise.allSettled(
    started.map(async entry => ({
      spec: entry.spec,
      title: entry.job.title,
      thumbnail: entry.job.info?.image || entry.job.thumbnail || '',
      downloadUrl: await loaderToWait(entry.job)
    }))
  );

  const ready = settled.filter(r => r.status === 'fulfilled').map(r => r.value);
  if (!ready.length) {
    const why = settled.find(r => r.status === 'rejected')?.reason?.message || 'tidak diketahui';
    throw new Error(`Video tidak bisa diunduh: ${why}`);
  }

  const order = YOUTUBE_FORMATS.map(f => f.token);
  ready.sort((a, b) => order.indexOf(a.spec.token) - order.indexOf(b.spec.token));

  const media = ready.map(entry => ({
    type: entry.spec.type,
    quality: entry.spec.quality,
    url: entry.downloadUrl,
    format: entry.spec.format,
    hasAudio: true
  }));

  const meta = ready[0];

  return {
    id: videoId,
    title: meta.title || 'YouTube Video',
    author: { name: 'YouTube', username: '' },
    type: media[0].type,
    thumbnail: meta.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    media,
    downloadUrl: media[0].url,
    totalMedia: media.length,
    source: 'loader_to'
  };
}

// ============================================
// API HANDLER
// ============================================
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // /api/health and /api/platforms live in their own route files;
  // Next.js is file-routed, so they can never be served from here.

  // Download endpoint
  if (req.method === 'POST') {
    // Extraction hits third-party providers, so throttle it per IP.
    if (!rateLimit(req, res, { limit: 20, windowMs: 60_000, key: 'download' })) return;

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
            error: { code: 'UNKNOWN_PLATFORM', message: 'Could not detect platform', supported: ['tiktok', 'instagram', 'facebook', 'twitter', 'threads', 'youtube'] }
          });
        }
      }

      const supportedPlatforms = ['tiktok', 'instagram', 'facebook', 'twitter', 'threads', 'youtube'];
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
        case 'youtube': result = await downloadYouTube(url); break;
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
