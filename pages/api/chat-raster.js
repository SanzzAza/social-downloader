const path = require('path');
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');

const WIDTH = 657;
const HEIGHT = 1137;
const MAX_TEXT = 44;
const TEMPLATE_PATH = path.join(process.cwd(), 'public', 'ios-chat-real-template.jpg');
const FONT_PATH = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Variable.ttf');

let fontReady = false;

function ensureFont() {
  if (fontReady) return;
  try {
    GlobalFonts.registerFromPath(FONT_PATH, 'MockRoboto');
  } catch (error) {
    console.warn('Raster font registration failed:', error.message);
  }
  fontReady = true;
}

function pick(req, key) {
  const source = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const value = source[key];
  return Array.isArray(value) ? value[0] : value;
}

function safeText(value, fallback) {
  const text = String(value || fallback).replace(/[\r\n]+/g, ' ').trim();
  return text.slice(0, MAX_TEXT) || fallback;
}

function batteryValue(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(100, parsed)) : 65;
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawStatusBar(ctx, { carrier, hour, battery }) {
  // The top area of the supplied raster template is intentionally flat,
  // which lets us replace only the editable iOS status values.
  ctx.fillStyle = '#08091d';
  ctx.fillRect(0, 0, WIDTH, 52);

  ctx.fillStyle = '#f4f8f8';
  ctx.strokeStyle = '#f4f8f8';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const bars = [3, 6, 9, 12];
  bars.forEach((height, index) => {
    ctx.fillRect(24 + index * 4, 34 - height, 2, height);
  });

  ctx.font = '600 16px MockRoboto, Arial, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(carrier, 50, 35);

  ctx.textAlign = 'center';
  ctx.fillText(hour, 328, 35);
  ctx.textAlign = 'left';
  ctx.fillText(`${battery}%`, 558, 35);

  ctx.strokeStyle = '#e6efee';
  ctx.lineWidth = 2;
  roundRect(ctx, 602, 21, 31, 16, 3);
  ctx.stroke();
  ctx.fillStyle = '#efcd44';
  roundRect(ctx, 605, 24, Math.max(3, Math.round(25 * battery / 100)), 10, 1.5);
  ctx.fill();
  ctx.fillStyle = '#e6efee';
  roundRect(ctx, 634, 26, 3, 6, 1);
  ctx.fill();
}

function drawMessage(ctx, text, hour) {
  ctx.font = '28px MockRoboto, Arial, sans-serif';
  const textWidth = ctx.measureText(text).width;
  const bubbleX = 19;
  const bubbleY = 479;
  const bubbleWidth = Math.max(108, Math.min(420, textWidth + 28));
  const bubbleHeight = 70;

  const gradient = ctx.createLinearGradient(bubbleX, bubbleY, bubbleX + bubbleWidth, bubbleY + bubbleHeight);
  gradient.addColorStop(0, '#464958');
  gradient.addColorStop(1, '#353744');
  ctx.fillStyle = gradient;
  roundRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 15);
  ctx.fill();

  ctx.fillStyle = '#f0f4f7';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, bubbleX + 13, bubbleY + 40);

  ctx.font = '14px MockRoboto, Arial, sans-serif';
  ctx.fillStyle = '#b7bdca';
  ctx.textAlign = 'right';
  ctx.fillText(hour, bubbleX + bubbleWidth - 12, bubbleY + 59);
  ctx.textAlign = 'left';
}

async function renderRaster({ text, carrier, hour, battery }) {
  ensureFont();
  const image = await loadImage(TEMPLATE_PATH);
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, WIDTH, HEIGHT);
  drawStatusBar(ctx, { carrier, hour, battery });
  drawMessage(ctx, text, hour);
  return canvas.toBuffer('image/png');
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, error: 'Gunakan GET atau POST' });
  }

  try {
    const output = await renderRaster({
      text: safeText(pick(req, 'text'), 'Hai'),
      carrier: safeText(pick(req, 'carrier'), 'Axis').slice(0, 16),
      hour: safeText(pick(req, 'hour'), '12').slice(0, 5),
      battery: batteryValue(pick(req, 'battery'))
    });

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
