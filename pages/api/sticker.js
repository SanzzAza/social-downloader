/**
 * Sticker API - Windows XP window meme generator.
 *
 * GET  /api/sticker?text=NYARI+STIKER+WA%3F
 * POST /api/sticker   { "text": "...", "title": "...", ... }
 *
 * Query/body params:
 *   text      (required) main sticker text, \n for manual line breaks
 *   title     titlebar caption          default "Windows Media Player"
 *   subtitle  small caption at bottom
 *   size      output size px (128-1024)  default 512
 *   format    webp | png                 default webp (WhatsApp-ready)
 *   color     text color                 default #000000
 *   bg        content background         default #ffffff
 *   align     left | center | right      default left
 *   image     URL of a picture to place on the right
 *   character 0 to hide the default shrug mascot
 *   download  1 to force file download
 */

const sharp = require('sharp');
const { renderWindowSticker } = require('../../lib/sticker');

const MAX_TEXT = 300;
const WHATSAPP_LIMIT = 100 * 1024; // 100 KB

function pick(req, key) {
  const source = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const value = source[key];
  return Array.isArray(value) ? value[0] : value;
}

function isSafeColor(value) {
  return typeof value === 'string' && /^#?[0-9a-f]{3,8}$/i.test(value.trim());
}

function normalizeColor(value, fallback) {
  if (!isSafeColor(value)) return fallback;
  const v = value.trim();
  return v.startsWith('#') ? v : `#${v}`;
}

/** Encode to WebP under WhatsApp's 100 KB cap by stepping quality down. */
async function toWhatsappWebp(png) {
  for (const quality of [92, 80, 68, 55, 42, 30, 20]) {
    const out = await sharp(png).webp({ quality, effort: 4 }).toBuffer();
    if (out.length <= WHATSAPP_LIMIT) return out;
  }
  return sharp(png).webp({ quality: 15, effort: 6 }).toBuffer();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Gunakan GET atau POST' }
    });
  }

  try {
    const text = pick(req, 'text');
    if (!text || !String(text).trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TEXT',
          message: 'Parameter "text" wajib diisi',
          example: '/api/sticker?text=NYARI%20STIKER%20WA%3F'
        }
      });
    }

    if (String(text).length > MAX_TEXT) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TEXT_TOO_LONG',
          message: `Teks maksimal ${MAX_TEXT} karakter (dikirim ${String(text).length})`
        }
      });
    }

    const rawSize = parseInt(pick(req, 'size'), 10);
    const size = Number.isFinite(rawSize) ? Math.min(1024, Math.max(128, rawSize)) : 512;

    const format = String(pick(req, 'format') || 'webp').toLowerCase() === 'png' ? 'png' : 'webp';
    const align = ['left', 'center', 'right'].includes(pick(req, 'align'))
      ? pick(req, 'align')
      : 'left';

    const imageUrl = pick(req, 'image');
    if (imageUrl && !/^https:\/\//i.test(imageUrl)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_IMAGE', message: 'Parameter "image" harus URL https' }
      });
    }

    const png = await renderWindowSticker({
      text: String(text),
      title: pick(req, 'title') ? String(pick(req, 'title')).slice(0, 60) : undefined,
      subtitle: pick(req, 'subtitle') ? String(pick(req, 'subtitle')).slice(0, 80) : '',
      size,
      textColor: normalizeColor(pick(req, 'color'), '#000000'),
      bgColor: normalizeColor(pick(req, 'bg'), '#ffffff'),
      align,
      imageUrl: imageUrl || '',
      character: !['0', 'false', 'no'].includes(String(pick(req, 'character')).toLowerCase())
    });

    const buffer = format === 'png'
      ? await sharp(png).png({ compressionLevel: 9 }).toBuffer()
      : await toWhatsappWebp(png);

    const filename = `sticker-${Date.now()}.${format}`;
    res.setHeader('Content-Type', format === 'png' ? 'image/png' : 'image/webp');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader(
      'Content-Disposition',
      `${pick(req, 'download') ? 'attachment' : 'inline'}; filename="${filename}"`
    );

    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Sticker error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'RENDER_FAILED', message: error.message }
    });
  }
}
