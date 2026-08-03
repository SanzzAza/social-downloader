/**
 * Tweet canvas image proxy.
 *
 * GET  /api/tweet?displayName=Gemini&username=gemini_ai&comment=Hello
 * POST /api/tweet { displayName, username, comment, avatar, verified, theme }
 *
 * The upstream endpoint returns an image, so this route keeps the provider
 * URL on the server and gives the frontend a same-origin, downloadable image.
 */

const UPSTREAM_URL = 'https://api.siputzx.my.id/api/canvas/tweet';
const DEFAULT_AVATAR = 'https://i.ibb.co/1s8T3sY/48f7ce63c7aa.jpg';
const MAX_DISPLAY_NAME = 80;
const MAX_USERNAME = 50;
const MAX_COMMENT = 280;
const MAX_AVATAR = 2048;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function valueFromRequest(req, key) {
  const source = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const value = source[key];
  return Array.isArray(value) ? value[0] : value;
}

function cleanText(value, fallback, maxLength) {
  const text = String(value ?? fallback).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
  return (text || fallback).slice(0, maxLength);
}

function cleanUsername(value) {
  return cleanText(value, 'username', MAX_USERNAME)
    .replace(/^@+/, '')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, MAX_USERNAME) || 'username';
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function safeTheme(value) {
  const theme = String(value || 'dark').toLowerCase();
  return ['dark', 'light'].includes(theme) ? theme : 'dark';
}

function safeAvatar(value) {
  const avatar = String(value || DEFAULT_AVATAR).trim().slice(0, MAX_AVATAR);
  try {
    const parsed = new URL(avatar);
    if (parsed.protocol !== 'https:') return DEFAULT_AVATAR;
    return parsed.toString();
  } catch (_) {
    return DEFAULT_AVATAR;
  }
}

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Gunakan GET atau POST' }
    });
  }

  const displayName = cleanText(valueFromRequest(req, 'displayName'), 'Gemini', MAX_DISPLAY_NAME);
  const username = cleanUsername(valueFromRequest(req, 'username'));
  const comment = cleanText(valueFromRequest(req, 'comment'), 'Hello World!', MAX_COMMENT);
  const avatar = safeAvatar(valueFromRequest(req, 'avatar'));
  const verified = parseBoolean(valueFromRequest(req, 'verified'), true);
  const theme = safeTheme(valueFromRequest(req, 'theme'));
  const shouldDownload = parseBoolean(valueFromRequest(req, 'download'), false);

  const params = new URLSearchParams({
    displayName,
    username,
    comment,
    avatar,
    verified: String(verified),
    theme
  });

  try {
    const upstream = await fetch(`${UPSTREAM_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'image/png,image/*;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(25000)
    });

    if (!upstream.ok) {
      return res.status(502).json({
        success: false,
        error: {
          code: 'UPSTREAM_ERROR',
          message: `Tweet canvas provider mengembalikan HTTP ${upstream.status}`
        }
      });
    }

    const contentType = upstream.headers.get('content-type') || 'image/png';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return res.status(502).json({
        success: false,
        error: {
          code: 'INVALID_UPSTREAM_RESPONSE',
          message: 'Provider tweet canvas tidak mengembalikan gambar'
        }
      });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (!buffer.length) {
      return res.status(502).json({
        success: false,
        error: { code: 'EMPTY_IMAGE', message: 'Gambar tweet kosong' }
      });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=86400');
    res.setHeader(
      'Content-Disposition',
      `${shouldDownload ? 'attachment' : 'inline'}; filename="tweet-${Date.now()}.png"`
    );

    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Tweet canvas error:', error);
    return res.status(502).json({
      success: false,
      error: {
        code: error.name === 'TimeoutError' ? 'UPSTREAM_TIMEOUT' : 'FETCH_FAILED',
        message: 'Gagal mengambil gambar tweet. Coba lagi sebentar.'
      }
    });
  }
}
