/**
 * Brat-style image proxy.
 *
 * GET  /api/brat?text=SanzzXD&delay=500
 * POST /api/brat { "text": "SanzzXD", "delay": 500 }
 *
 * The provider returns a PNG. Keeping the request behind our own route makes
 * the frontend same-origin and gives us validation, timeout and rate limits.
 */

const UPSTREAM_URL = 'https://api.siputzx.my.id/api/m/brat';
const MAX_TEXT = 200;
const MAX_DELAY = 5000;
const DEFAULT_DELAY = 500;
const { rateLimit } = require('../../lib/rateLimit');

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function valueFromRequest(req, key) {
  const source = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const value = source[key];
  return Array.isArray(value) ? value[0] : value;
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .trim()
    .slice(0, MAX_TEXT);
}

function cleanDelay(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_DELAY;
  return Math.max(0, Math.min(MAX_DELAY, parsed));
}

function parseBoolean(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

export const config = { maxDuration: 60 };

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

  if (!rateLimit(req, res, { limit: 30, windowMs: 60_000, key: 'brat' })) return;

  const text = cleanText(valueFromRequest(req, 'text'));
  if (!text) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_TEXT',
        message: 'Parameter "text" wajib diisi',
        example: '/api/brat?text=SanzzXD&delay=500'
      }
    });
  }

  const delay = cleanDelay(valueFromRequest(req, 'delay'));
  const shouldDownload = parseBoolean(valueFromRequest(req, 'download'));
  const params = new URLSearchParams({ text, delay: String(delay) });

  try {
    const upstream = await fetch(`${UPSTREAM_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'image/png,image/*;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(55_000)
    });

    if (!upstream.ok) {
      return res.status(502).json({
        success: false,
        error: {
          code: 'UPSTREAM_ERROR',
          message: `Brat provider mengembalikan HTTP ${upstream.status}`
        }
      });
    }

    const contentType = upstream.headers.get('content-type') || 'image/png';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return res.status(502).json({
        success: false,
        error: {
          code: 'INVALID_UPSTREAM_RESPONSE',
          message: 'Brat provider tidak mengembalikan gambar'
        }
      });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (!buffer.length) {
      return res.status(502).json({
        success: false,
        error: { code: 'EMPTY_IMAGE', message: 'Gambar Brat kosong' }
      });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=86400');
    res.setHeader(
      'Content-Disposition',
      `${shouldDownload ? 'attachment' : 'inline'}; filename="brat-${Date.now()}.png"`
    );

    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Brat API error:', error);
    return res.status(502).json({
      success: false,
      error: {
        code: error.name === 'TimeoutError' ? 'UPSTREAM_TIMEOUT' : 'FETCH_FAILED',
        message: 'Gagal mengambil gambar Brat. Coba lagi sebentar.'
      }
    });
  }
}
