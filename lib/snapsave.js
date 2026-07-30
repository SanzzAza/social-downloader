/**
 * SnapSave Instagram Downloader - Node.js Module
 * 
 * Endpoint yang dipakai dari https://snapsave.app/download-video-instagram:
 * 
 *   POST https://snapsave.app/action.php?lang=en
 *     Body: url=<instagram_url>
 *     Response: Obfuscated JavaScript → decode → HTML dengan download links
 * 
 *   GET https://snapsave.app/task.php?token={id}
 *     Response: JSON { status, progress, download_url }
 * 
 * Flow:
 *   1. Ambil cookies dari halaman utama SnapSave (PHPSESSID)
 *   2. POST ke action.php dengan URL Instagram
 *   3. Decode obfuscated JavaScript via vm module
 *   4. Parse HTML hasil decode → extract download URLs + thumbnails via cheerio
 */

const cheerio = require('cheerio');

const BASE_URL = 'https://snapsave.app';
const ACTION_URL = `${BASE_URL}/action.php`;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

/**
 * Decode obfuscated JavaScript dari response SnapSave.
 * Pakai Node.js vm module untuk eksekusi eval() di sandbox.
 */
function decodeObfuscatedJS(jsCode) {
  const vm = require('vm');
  
  let capturedOutput = '';
  
  const sandbox = {
    // Mock DOM APIs biar tidak crash
    document: {
      querySelector: () => ({ 
        innerHTML: '', 
        classList: { add(){}, remove(){} },
        scrollIntoView() {},
        style: {},
      }),
      getElementById: () => ({ 
        innerHTML: '', 
        style: { display: '', width: '' },
        classList: { add(){}, remove(){} },
        scrollIntoView() {},
        remove() {},
        childNodes: [],
      }),
      getElementsByTagName: () => [],
    },
    window: {
      // hostname bukan snapsave.app → bypass error handler internal
      location: { hostname: 'external' },
    },
    location: { hostname: 'external' },
    gtag: () => {},
    console: { log: (...args) => { capturedOutput += args.join(' ') + '\n'; } },
    setTimeout: () => 0,
    setInterval: () => 0,
    clearInterval: () => {},
    clearTimeout: () => {},
    // Global functions yang dipakai obfuscated JS
    decodeURIComponent: decodeURIComponent,
    encodeURIComponent: encodeURIComponent,
    escape: escape,
    unescape: unescape,
    Date: Date,
    Math: Math,
    String: String,
    Number: Number,
    Array: Array,
    Object: Object,
    RegExp: RegExp,
    JSON: JSON,
    Error: Error,
    TypeError: TypeError,
    __decodeResult: '',
  };
  
  try {
    // Ganti eval() dengan capture ke variable
    const modifiedCode = jsCode.replace(/\beval\s*\(/g, '(__decodeResult = (');
    
    const context = vm.createContext(sandbox);
    vm.runInContext(`var __decodeResult = ''; ${modifiedCode});`, context, { timeout: 15000 });
    
    return sandbox.__decodeResult || capturedOutput || '';
  } catch (e) {
    // Fallback: coba extract URLs langsung dari raw JS
    return jsCode;
  }
}

/**
 * Extract download links + thumbnails dari decoded HTML.
 * Decoded content format: if(...){...innerHTML = "<html>...";...}
 * Perlu extract HTML dari dalam innerHTML assignment dulu.
 */
function extractLinks(decodedHtml) {
  // Extract HTML dari innerHTML = "..."
  let html = decodedHtml;
  const innerMatch = decodedHtml.match(/innerHTML\s*=\s*"([\s\S]*)/);
  if (innerMatch) {
    html = innerMatch[1];
    // Hapus trailing "; dan kode setelahnya
    html = html.replace(/";[\s\S]*$/, '');
  }
  
  // Unescape JavaScript string
  html = html
    .replace(/\\"/g, '"')
    .replace(/\\\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '\n');
  
  const $ = cheerio.load(html);
  const links = [];
  const seen = new Set();
  
  // Extract thumbnails
  const thumbnails = [];
  $('img[src]').each((i, el) => {
    const src = $(el).attr('src');
    if (src && (src.includes('thumb') || src.includes('cdn') || src.includes('rapidcdn'))) {
      thumbnails.push(src);
    }
  });
  
  // Extract download links
  let linkIdx = 0;
  $('a[href]').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    
    if (!href) return;
    
    // Skip non-content
    if (href.includes('play.google.com') || href.includes('apple.com') || 
        href === '#' || href.startsWith('javascript:')) return;
    
    // Only CDN/download URLs
    if (href.includes('rapidcdn') || href.includes('.mp4') || 
        href.includes('.webm') || href.includes('download') ||
        (href.includes('cdn') && href.includes('http'))) {
      
      if (!seen.has(href)) {
        seen.add(href);
        links.push({
          url: href,
          label: text || 'Download',
          thumbnail: thumbnails[linkIdx] || null,
        });
        linkIdx++;
      }
    }
  });
  
  // Fallback: regex
  if (links.length === 0) {
    const urlPattern = /https?:\/\/[^\s"'<>]+?(?:rapidcdn|cdninstagram|fbcdn)[^\s"'<>]*/gi;
    let match;
    while ((match = urlPattern.exec(html)) !== null) {
      if (!seen.has(match[0])) {
        seen.add(match[0]);
        links.push({ url: match[0], label: 'Video', thumbnail: null });
      }
    }
  }
  
  return links;
}

/**
 * Download Instagram via SnapSave.
 * 
 * @param {string} url - URL Instagram
 * @returns {Promise<{success: boolean, links: Array, error?: string}>}
 */
async function downloadInstagramSnapSave(url) {
  try {
    // Step 1: Ambil session cookies dari SnapSave
    const sessionRes = await fetch(`${BASE_URL}/download-video-instagram`, {
      headers: HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    
    const cookies = sessionRes.headers.get('set-cookie') || '';
    
    // Step 2: POST ke action.php
    const response = await fetch(`${ACTION_URL}?lang=en`, {
      method: 'POST',
      headers: {
        ...HEADERS,
        'Origin': BASE_URL,
        'Referer': `${BASE_URL}/download-video-instagram`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies,
      },
      body: new URLSearchParams({ url: url.trim() }),
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) {
      throw new Error(`SnapSave HTTP ${response.status}`);
    }
    
    const rawJs = await response.text();
    
    // Step 3: Decode obfuscated JavaScript
    const decoded = decodeObfuscatedJS(rawJs);
    
    if (!decoded || decoded.length < 50) {
      throw new Error('SnapSave decode failed');
    }
    
    // Step 4: Extract download links
    const links = extractLinks(decoded);
    
    if (links.length === 0) {
      throw new Error('SnapSave: no download links found');
    }
    
    return {
      success: true,
      links,
      thumbnail: links[0]?.thumbnail || null,
    };
    
  } catch (error) {
    return {
      success: false,
      links: [],
      error: error.message,
    };
  }
}

module.exports = { downloadInstagramSnapSave };
