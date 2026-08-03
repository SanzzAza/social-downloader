const path = require('path');
const sharp = require('sharp');

const WIDTH = 657;
const HEIGHT = 1137;
const MAX_TEXT = 44;

function pick(req, key) {
  const source = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const value = source[key];
  return Array.isArray(value) ? value[0] : value;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeText(value, fallback) {
  const text = String(value || fallback).replace(/[\r\n]+/g, ' ').trim();
  return text.slice(0, MAX_TEXT) || fallback;
}

function batteryValue(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(100, parsed)) : 65;
}

function estimateBubbleWidth(text) {
  // The raster template leaves the menu below the bubble, so a longer
  // message can grow horizontally without changing the scene composition.
  const estimated = 35 + text.length * 14.3;
  return Math.max(108, Math.min(420, estimated));
}

function renderOverlay({ text, carrier, hour, battery }) {
  const message = escapeXml(safeText(text, 'Hai'));
  const operator = escapeXml(safeText(carrier, 'Axis').slice(0, 16));
  const clock = escapeXml(safeText(hour, '12').slice(0, 5));
  const percent = batteryValue(battery);
  const bubbleX = 19;
  const bubbleY = 479;
  const bubbleWidth = estimateBubbleWidth(message);
  const bubbleRight = bubbleX + bubbleWidth;

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <defs>
        <linearGradient id="messageBubble" x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stop-color="#464958"/>
          <stop offset="1" stop-color="#353744"/>
        </linearGradient>
      </defs>

      <!-- Repaint the iOS status bar so carrier, clock and battery are editable. -->
      <rect x="0" y="0" width="657" height="52" fill="#08091d"/>
      <g fill="#f4f8f8" stroke="#f4f8f8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M24 34h2v-3h-2zm4 0h2v-6h-2zm4 0h2v-9h-2zm4 0h2V22h-2z" stroke="none"/>
        <text x="50" y="35" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="600" stroke="none">${operator}</text>
        <text x="328" y="35" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="600" stroke="none">${clock}</text>
      </g>
      <g font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="600" fill="#f4f8f8" stroke="none">
        <text x="558" y="35">${percent}%</text>
      </g>
      <rect x="602" y="21" width="31" height="16" rx="3" fill="none" stroke="#e6efee" stroke-width="2"/>
      <rect x="605" y="24" width="${Math.max(3, Math.round(25 * percent / 100))}" height="10" rx="1.5" fill="${percent <= 20 ? '#efcd44' : '#efcd44'}"/>
      <rect x="634" y="26" width="3" height="6" rx="1" fill="#e6efee"/>

      <!-- Replace the fixed sample message while preserving the raster scene. -->
      <rect x="${bubbleX}" y="${bubbleY}" width="${bubbleWidth}" height="70" rx="15" fill="url(#messageBubble)"/>
      <text x="${bubbleX + 13}" y="${bubbleY + 40}" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#f0f4f7" stroke="none">${message}</text>
      <text x="${bubbleRight - 12}" y="${bubbleY + 59}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#b7bdca" stroke="none">${clock}</text>
    </svg>
  `);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, error: 'Gunakan GET atau POST' });
  }

  try {
    const templatePath = path.join(process.cwd(), 'public', 'ios-chat-real-template.jpg');
    const overlay = renderOverlay({
      text: pick(req, 'text'),
      carrier: pick(req, 'carrier'),
      hour: pick(req, 'hour'),
      battery: pick(req, 'battery')
    });

    const output = await sharp(templatePath)
      .resize(WIDTH, HEIGHT, { fit: 'fill' })
      .composite([{ input: overlay, top: 0, left: 0 }])
      .png({ compressionLevel: 9 })
      .toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', output.length);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(output);
  } catch (error) {
    console.error('Chat raster error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'RENDER_FAILED', message: error.message }
    });
  }
}
