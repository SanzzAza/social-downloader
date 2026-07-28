/**
 * Sticker generator - Windows XP window meme template.
 *
 * Draws the whole window (titlebar, buttons, menu bar, canvas) programmatically
 * so no template image asset is needed. Only the text is customizable.
 */

const path = require('path');
const fs = require('fs');
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');

// Bundled mascot used when no custom image is supplied.
const DEFAULT_CHARACTER = path.join(process.cwd(), 'public', 'assets', 'shrug.png');

// ---- Font registration (once per cold start) ----
let fontReady = false;
function ensureFont() {
  if (fontReady) return;
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'ArchivoBlack-Regular.ttf');
  try {
    GlobalFonts.registerFromPath(fontPath, 'StickerBold');
  } catch (_) {
    // fall back to whatever sans-serif exists in the runtime
  }
  fontReady = true;
}

const FONT_STACK = 'StickerBold, "Arial Black", Impact, sans-serif';
const UI_FONT = '"Segoe UI", Tahoma, DejaVu Sans, sans-serif';

// XP Luna theme palette
const XP = {
  blueDark: '#0831d9',
  blueMid: '#1e5be5',
  blueLight: '#4a90f0',
  border: '#0043c8',
  menuBg: '#ece9d8',
  menuText: '#000000',
  closeRed: '#e04343',
  closeRedDark: '#b02020',
  btnBlue: '#3d7ce0'
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Wrap text to fit `maxWidth`, shrinking the font until it also fits
 * vertically in `maxHeight`. Respects manual line breaks.
 */
function fitText(ctx, text, maxWidth, maxHeight, startSize) {
  for (let size = startSize; size >= 12; size -= 2) {
    ctx.font = `${size}px ${FONT_STACK}`;
    const lineHeight = size * 1.12;
    const lines = [];
    let tooWide = false;

    for (const paragraph of String(text).split(/\r?\n/)) {
      if (!paragraph.trim()) { lines.push(''); continue; }
      let current = '';
      for (const word of paragraph.split(/\s+/)) {
        const candidate = current ? `${current} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxWidth) {
          current = candidate;
        } else {
          if (current) lines.push(current);
          // single word longer than the box -> shrink further
          if (ctx.measureText(word).width > maxWidth) { tooWide = true; break; }
          current = word;
        }
      }
      if (tooWide) break;
      if (current) lines.push(current);
    }

    if (tooWide) continue;
    if (lines.length * lineHeight <= maxHeight) {
      return { lines, size, lineHeight };
    }
  }

  ctx.font = `12px ${FONT_STACK}`;
  return { lines: [String(text)], size: 12, lineHeight: 14 };
}

function drawTitlebar(ctx, x, y, w, h, title) {
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, XP.blueLight);
  grad.addColorStop(0.1, XP.blueMid);
  grad.addColorStop(0.45, XP.blueDark);
  grad.addColorStop(0.9, XP.blueMid);
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  // square off the bottom corners
  ctx.fillRect(x, y + h - 10, w, 10);

  // title text, clipped so it can never run under the window buttons
  const btnZone = h * 0.82 * 3 + 3 * 3 + 10;
  const titleX = x + h * 0.95;
  const titleMax = w - (titleX - x) - btnZone;

  ctx.save();
  ctx.beginPath();
  ctx.rect(titleX, y, Math.max(10, titleMax), h);
  ctx.clip();
  ctx.font = `bold ${Math.round(h * 0.5)}px ${UI_FONT}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  let shown = title;
  if (ctx.measureText(shown).width > titleMax) {
    while (shown.length > 1 && ctx.measureText(`${shown}...`).width > titleMax) {
      shown = shown.slice(0, -1);
    }
    shown = `${shown}...`;
  }

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText(shown, titleX + 1, y + h / 2 + 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(shown, titleX, y + h / 2);
  ctx.restore();

  // small app icon
  const ic = h * 0.52;
  const iy = y + (h - ic) / 2;
  ctx.fillStyle = '#2b6fd4';
  roundRect(ctx, x + 6, iy, ic, ic, 3);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + 6 + ic / 2, iy + ic / 2, ic * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // window buttons
  const bw = h * 0.82;
  const bh = h * 0.66;
  const by = y + (h - bh) / 2;
  const gap = 3;
  const buttons = [
    { fill: XP.btnBlue, glyph: 'min' },
    { fill: XP.btnBlue, glyph: 'max' },
    { fill: XP.closeRed, glyph: 'close' }
  ];

  buttons.forEach((b, i) => {
    const bx = x + w - (bw + gap) * (buttons.length - i) - 4;
    const g = ctx.createLinearGradient(0, by, 0, by + bh);
    g.addColorStop(0, b.glyph === 'close' ? '#f08080' : '#79a9f5');
    g.addColorStop(1, b.glyph === 'close' ? XP.closeRedDark : '#2a5fbd');
    ctx.fillStyle = g;
    roundRect(ctx, bx, by, bw, bh, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, bh * 0.09);
    ctx.lineCap = 'round';
    const cx = bx + bw / 2;
    const cy = by + bh / 2;
    const s = bh * 0.22;
    ctx.beginPath();
    if (b.glyph === 'min') {
      ctx.moveTo(cx - s, cy + s * 0.8);
      ctx.lineTo(cx + s, cy + s * 0.8);
    } else if (b.glyph === 'max') {
      ctx.strokeRect(cx - s, cy - s, s * 2, s * 2);
    } else {
      ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s);
      ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s);
    }
    ctx.stroke();
  });
}

/**
 * @param {object} opts
 * @param {string} opts.text        main sticker text
 * @param {string} [opts.title]     titlebar caption
 * @param {string} [opts.subtitle]  small text under the main text
 * @param {number} [opts.size]      output square size in px
 * @param {string} [opts.textColor]
 * @param {string} [opts.bgColor]   window content background
 * @param {string} [opts.align]     left | center | right
 * @param {string} [opts.imageUrl]  custom picture on the right (overrides mascot)
 * @param {boolean} [opts.character] set false to hide the default mascot side
 * @returns {Promise<Buffer>} PNG buffer with transparent margins
 */
async function renderWindowSticker(opts = {}) {
  ensureFont();

  const {
    text = 'NYARI STIKER WA?',
    title = 'Windows Media Player',
    subtitle = '',
    size = 512,
    textColor = '#000000',
    bgColor = '#ffffff',
    align = 'left',
    imageUrl = '',
    character = true
  } = opts;

  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // transparent padding so the sticker has breathing room
  const pad = Math.round(size * 0.045);
  const winX = pad;
  const winY = Math.round(size * 0.16);
  const winW = size - pad * 2;
  const winH = size - winY - pad;

  // drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = size * 0.035;
  ctx.shadowOffsetY = size * 0.012;
  ctx.fillStyle = XP.border;
  roundRect(ctx, winX, winY, winW, winH, 9);
  ctx.fill();
  ctx.restore();

  const tbH = Math.round(winH * 0.115);
  drawTitlebar(ctx, winX, winY, winW, tbH, title);

  // menu bar
  const menuH = Math.round(tbH * 0.62);
  const menuY = winY + tbH;
  ctx.fillStyle = XP.menuBg;
  ctx.fillRect(winX + 3, menuY, winW - 6, menuH);
  ctx.font = `${Math.round(menuH * 0.62)}px ${UI_FONT}`;
  ctx.fillStyle = XP.menuText;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  let mx = winX + 12;
  for (const item of ['File', 'View', 'Play', 'Tools', 'Help']) {
    ctx.fillText(item, mx, menuY + menuH / 2);
    mx += ctx.measureText(item).width + menuH * 0.75;
  }

  // content area
  const cX = winX + 3;
  const cY = menuY + menuH;
  const cW = winW - 6;
  const cH = winY + winH - cY - 3;
  ctx.fillStyle = bgColor;
  ctx.fillRect(cX, cY, cW, cH);

  // Right-side character. Defaults to the bundled shrug mascot; pass
  // character:false to disable, or imageUrl to override it.
  let textBoxW = cW;
  let charSource = null;
  if (imageUrl) charSource = imageUrl;
  else if (character !== false && fs.existsSync(DEFAULT_CHARACTER)) charSource = DEFAULT_CHARACTER;

  if (charSource) {
    try {
      const img = await loadImage(charSource);
      const boxW = cW * 0.44;
      const boxH = cH * 0.88;
      const scale = Math.min(boxW / img.width, boxH / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = cX + cW - dw - cW * 0.02;
      const dy = cY + cH - dh - cH * 0.02;

      // soft blue glow behind the figure, like the reference sticker
      ctx.save();
      ctx.shadowColor = 'rgba(90, 165, 255, 0.85)';
      ctx.shadowBlur = size * 0.05;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.shadowBlur = size * 0.028;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();

      ctx.drawImage(img, dx, dy, dw, dh);
      textBoxW = cW - dw - cW * 0.04;
    } catch (_) {
      // unreachable image -> fall back to full-width text
    }
  }

  // main text
  const innerPad = cW * 0.06;
  const maxW = textBoxW - innerPad * 2;
  const subReserve = subtitle ? cH * 0.16 : 0;
  const maxH = cH - innerPad * 2 - subReserve;

  const { lines, size: fontSize, lineHeight } = fitText(
    ctx, text, maxW, maxH, Math.round(cH * 0.19)
  );

  ctx.font = `${fontSize}px ${FONT_STACK}`;
  ctx.fillStyle = textColor;
  ctx.textBaseline = 'top';
  ctx.textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';

  const blockH = lines.length * lineHeight;
  let ty = cY + (cH - subReserve - blockH) * 0.38;
  const tx = align === 'center'
    ? cX + innerPad + maxW / 2
    : align === 'right'
      ? cX + innerPad + maxW
      : cX + innerPad;

  for (const line of lines) {
    ctx.fillText(line, tx, ty);
    ty += lineHeight;
  }

  if (subtitle) {
    ctx.font = `${Math.round(cH * 0.075)}px ${UI_FONT}`;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.textAlign = 'center';
    ctx.fillText(subtitle, cX + cW / 2, cY + cH - innerPad - cH * 0.09);
  }

  return canvas.toBuffer('image/png');
}

module.exports = { renderWindowSticker };
