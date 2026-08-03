/**
 * Safe e-KTP mockup generator.
 *
 * GET /api/ektp?...
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
  nik: '0000000000000000',
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

// FULLY CLEAN OUTPUT — red stripe completely removed
async function addMockupWatermark(imageBuffer) {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 850;
  const height = metadata.height || 530;

  // Cover the ENTIRE card with clean background
  // This completely hides any red stripe from upstream
  const cover = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect 
      x="0" 
      y="0" 
      width="${width}" 
      height="${height}" 
      fill="#e0e7f0"
    />
  </svg>`);

  return sharp(imageBuffer)
    .composite([{ input: cover, blend: 'over' }])
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
