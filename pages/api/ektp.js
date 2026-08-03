/**
 * Safe e-KTP mockup generator.
 *
 * This intentionally never exposes the upstream image unchanged. Every
 * response receives a prominent "CONTOH / TIDAK BERLAKU" watermark so the
 * endpoint is suitable only for UI demos and fictional mockups.
 *
 * GET /api/ektp?nama=John%20Doe&provinsi=JAWA%20BARAT&...
 * POST /api/ektp { nama, provinsi, kota, ... }
 */

const sharp = require('sharp');
const { rateLimit } = require('../../lib/rateLimit');

const UPSTREAM_URL = 'https://api.siputzx.my.id/api/canvas/ektp';
const DEFAULT_PHOTO = 'https://cdn.phototourl.com/free/2026-08-03-0257667d-e703-446e-a81d-ca5f0fa18fe3.png';
const MAX_VALUE = 160;
const MAX_PHOTO_URL = 2048;

const DEFAULTS = {
  provinsi: 'JAWA BARAT',
  kota: 'BANDUNG',
  nama: 'John Doe',
  ttl: 'Bandung, 01-01-1990',
  jenis_kelamin: 'Laki-laki',
  golongan_darah: 'O',
  alamat: 'Jl. Contoh No. 123',
  'rt/rw': '001/002',
  'kel/desa': 'Sukajadi',
  kecamatan: 'Sukajadi',
  agama: 'Islam',
  status: 'Belum Kawin',
  pekerjaan: 'Pegawai Swasta',
  kewarganegaraan: 'WNI',
  masa_berlaku: 'Seumur Hidup',
  terbuat: '01-01-2023'
};

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function valueFromRequest(req, key) {
  const source = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const value = source[key];
  return Array.isArray(value) ? value[0] : value;
}

function cleanValue(value, fallback = '', maxLength = MAX_VALUE) {
  const text = String(value ?? fallback)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .trim();
  return (text || fallback).slice(0, maxLength);
}

function safePhoto(value) {
  const candidate = String(value || DEFAULT_PHOTO).trim().slice(0, MAX_PHOTO_URL);
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'https:' ? parsed.toString() : DEFAULT_PHOTO;
  } catch (_) {
    return DEFAULT_PHOTO;
  }
}

function parseBoolean(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function watermarkSvg(width, height) {
  const diagonalSize = Math.max(24, Math.round(Math.min(width, height) * 0.065));
  const bannerSize = Math.max(22, Math.round(Math.min(width, height) * 0.045));
  const diagonalText = 'CONTOH  •  TIDAK BERLAKU';
  const repeated = [];

  for (let y = -height; y < height * 2; y += diagonalSize * 2.4) {
    repeated.push(
      `<text x="${Math.round(width * 0.08)}" y="${y}" font-size="${diagonalSize}" ` +
      `font-family="Arial, sans-serif" font-weight="900">${diagonalText}</text>`
    );
  }

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(-25 ${width / 2} ${height / 2})" fill="#b91c1c" opacity="0.32" stroke="#ffffff" stroke-width="2" paint-order="stroke">
      ${repeated.join('')}
    </g>
    <rect x="0" y="${Math.round(height * 0.42)}" width="${width}" height="${Math.round(height * 0.16)}" fill="#991b1b" opacity="0.86" />
    <text x="${width / 2}" y="${Math.round(height * 0.52)}" text-anchor="middle" dominant-baseline="middle"
      fill="#ffffff" font-size="${bannerSize}" font-family="Arial, sans-serif" font-weight="900"
      letter-spacing="2">CONTOH / TIDAK BERLAKU</text>
  </svg>`;
}

async function addMockupWatermark(imageBuffer) {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 850;
  const height = metadata.height || 530;
  const overlay = Buffer.from(watermarkSvg(width, height));

  return sharp(imageBuffer)
    .composite([{ input: overlay, blend: 'over' }])
    .png()
    .toBuffer();
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

  if (!rateLimit(req, res, { limit: 10, windowMs: 60_000, key: 'ektp' })) return;

  const params = new URLSearchParams();
  for (const [key, fallback] of Object.entries(DEFAULTS)) {
    params.set(key, cleanValue(valueFromRequest(req, key), fallback));
  }

  // A mockup must not turn into an identity-document generator. Keep the
  // identifier synthetic even if a caller sends a real-looking NIK.
  params.set('nik', '0000000000000000');
  params.set('pas_photo', safePhoto(valueFromRequest(req, 'pas_photo')));
  const shouldDownload = parseBoolean(valueFromRequest(req, 'download'));

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
          message: `e-KTP mockup provider mengembalikan HTTP ${upstream.status}`
        }
      });
    }

    const contentType = upstream.headers.get('content-type') || 'image/png';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return res.status(502).json({
        success: false,
        error: {
          code: 'INVALID_UPSTREAM_RESPONSE',
          message: 'Provider e-KTP tidak mengembalikan gambar'
        }
      });
    }

    const upstreamBuffer = Buffer.from(await upstream.arrayBuffer());
    if (!upstreamBuffer.length) {
      return res.status(502).json({
        success: false,
        error: { code: 'EMPTY_IMAGE', message: 'Gambar e-KTP mockup kosong' }
      });
    }

    const output = await addMockupWatermark(upstreamBuffer);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', output.length);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Mockup-Watermark', 'CONTOH-TIDAK-BERLAKU');
    res.setHeader(
      'Content-Disposition',
      `${shouldDownload ? 'attachment' : 'inline'}; filename="ektp-mockup-tidak-berlaku.png"`
    );

    return res.status(200).send(output);
  } catch (error) {
    console.error('e-KTP mockup error:', error);
    return res.status(502).json({
      success: false,
      error: {
        code: error.name === 'TimeoutError' ? 'UPSTREAM_TIMEOUT' : 'FETCH_FAILED',
        message: 'Gagal membuat e-KTP mockup. Coba lagi sebentar.'
      }
    });
  }
}
