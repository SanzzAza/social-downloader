import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const PRESETS = [
  'Windows Media Player',
  'Notepad',
  'MSN Messenger',
  'Internet Explorer',
  'System Error',
  'My Computer'
];

export default function StickerMaker() {
  const [text, setText] = useState('NYARI STIKER WA?');
  const [title, setTitle] = useState('Windows Media Player');
  const [subtitle, setSubtitle] = useState('');
  const [align, setAlign] = useState('left');
  const [color, setColor] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const [format, setFormat] = useState('webp');
  const [size, setSize] = useState(512);
  const [character, setCharacter] = useState(true);
  const [src, setSrc] = useState('');

  const buildUrl = useCallback((extra = {}) => {
    const p = new URLSearchParams({
      text, title, align, format, size: String(size),
      color: color.replace('#', ''),
      bg: bg.replace('#', ''),
      ...extra
    });
    if (subtitle) p.set('subtitle', subtitle);
    if (!character) p.set('character', '0');
    return `/api/sticker?${p.toString()}`;
  }, [text, title, subtitle, align, color, bg, format, size, character]);

  useEffect(() => {
    const t = setTimeout(() => setSrc(buildUrl()), 350);
    return () => clearTimeout(t);
  }, [buildUrl]);

  const box = {
    border: '3px solid #1A1A2E',
    padding: '12px 14px',
    fontFamily: 'inherit',
    fontSize: 15,
    background: '#fff',
    width: '100%',
    boxSizing: 'border-box'
  };
  const label = {
    display: 'block',
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase'
  };
  const field = { marginBottom: 18 };

  return (
    <div style={{
      fontFamily: '"Courier New", monospace',
      background: '#F7F7F7',
      minHeight: '100vh',
      padding: '32px 20px'
    }}>
      <Head>
        <title>Sticker Maker - Bikin Stiker WhatsApp Custom</title>
        <meta name="description" content="Generator stiker WhatsApp template jendela Windows XP. Ketik teks, langsung jadi WebP 512x512 transparan siap pakai." />
        <meta property="og:title" content="Sticker Maker - Bikin Stiker WhatsApp Custom" />
        <meta property="og:description" content="Ketik teksnya, stiker Windows XP langsung jadi." />
        <meta property="og:image" content="/api/sticker?text=NYARI%20STIKER%20WA%3F&format=png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#1A1A2E" />
      </Head>

      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            marginBottom: 18,
            border: '3px solid #1A1A2E',
            background: '#fff',
            color: '#1A1A2E',
            padding: '8px 15px',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1,
            textDecoration: 'none',
            boxShadow: '3px 3px 0 #1A1A2E'
          }}
        >
          &larr; BALIK KE DOWNLOADER
        </Link>

        <h1 style={{
          fontSize: 34, fontWeight: 900, margin: '0 0 4px',
          letterSpacing: -1, textTransform: 'uppercase'
        }}>
          Sticker Maker
        </h1>
        <p style={{ margin: '0 0 28px', fontSize: 14, opacity: 0.7 }}>
          Template jendela Windows XP &mdash; tinggal ganti teksnya.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: 28,
          alignItems: 'start'
        }}>
          {/* ---- controls ---- */}
          <div style={{
            background: '#fff',
            border: '3px solid #1A1A2E',
            boxShadow: '8px 8px 0 #1A1A2E',
            padding: 24
          }}>
            <div style={field}>
              <label style={label}>Teks Stiker</label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value.slice(0, 300))}
                rows={3}
                style={{ ...box, resize: 'vertical', fontWeight: 700 }}
                placeholder="Tulis teks di sini..."
              />
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                {text.length}/300 &middot; Enter untuk baris baru
              </div>
            </div>

            <div style={field}>
              <label style={label}>Judul Jendela</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value.slice(0, 60))}
                style={box}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {PRESETS.map(p => (
                  <button
                    key={p}
                    onClick={() => setTitle(p)}
                    style={{
                      border: '2px solid #1A1A2E',
                      background: title === p ? '#FF6B35' : '#fff',
                      color: title === p ? '#fff' : '#1A1A2E',
                      padding: '5px 9px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div style={field}>
              <label style={label}>Subtitle (opsional)</label>
              <input
                value={subtitle}
                onChange={e => setSubtitle(e.target.value.slice(0, 80))}
                style={box}
                placeholder="teks kecil di bawah"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14, ...field }}>
              <div>
                <label style={label}>Perataan</label>
                <select value={align} onChange={e => setAlign(e.target.value)} style={box}>
                  <option value="left">Kiri</option>
                  <option value="center">Tengah</option>
                  <option value="right">Kanan</option>
                </select>
              </div>
              <div>
                <label style={label}>Format</label>
                <select value={format} onChange={e => setFormat(e.target.value)} style={box}>
                  <option value="webp">WebP (WhatsApp)</option>
                  <option value="png">PNG</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 14, ...field }}>
              <div>
                <label style={label}>Warna Teks</label>
                <input type="color" value={color} onChange={e => setColor(e.target.value)}
                  style={{ ...box, padding: 4, height: 46 }} />
              </div>
              <div>
                <label style={label}>Background</label>
                <input type="color" value={bg} onChange={e => setBg(e.target.value)}
                  style={{ ...box, padding: 4, height: 46 }} />
              </div>
              <div>
                <label style={label}>Ukuran</label>
                <select value={size} onChange={e => setSize(Number(e.target.value))} style={box}>
                  <option value={512}>512px</option>
                  <option value={768}>768px</option>
                  <option value={1024}>1024px</option>
                </select>
              </div>
            </div>

            <div style={field}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer', fontWeight: 700, fontSize: 13
              }}>
                <input
                  type="checkbox"
                  checked={character}
                  onChange={e => setCharacter(e.target.checked)}
                  style={{ width: 20, height: 20, accentColor: '#FF6B35', cursor: 'pointer' }}
                />
                Tampilkan karakter 3D
              </label>
            </div>

            <a
              href={buildUrl({ download: '1' })}
              download
              style={{
                display: 'block',
                textAlign: 'center',
                background: '#FF6B35',
                color: '#fff',
                border: '3px solid #1A1A2E',
                boxShadow: '5px 5px 0 #1A1A2E',
                padding: '15px',
                fontWeight: 900,
                fontSize: 16,
                letterSpacing: 1,
                textDecoration: 'none',
                textTransform: 'uppercase'
              }}
            >
              Download Stiker &darr;
            </a>
          </div>

          {/* ---- preview ---- */}
          <div>
            <div style={{
              background: '#fff',
              border: '3px solid #1A1A2E',
              boxShadow: '8px 8px 0 #1A1A2E',
              padding: 18
            }}>
              <div style={{ ...label, marginBottom: 12 }}>Preview</div>
              <div style={{
                background:
                  'repeating-conic-gradient(#e8e8e2 0% 25%, #fff 0% 50%) 50%/18px 18px',
                border: '2px solid #ddd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 240
              }}>
                {src
                  ? <img src={src} alt="preview" style={{ width: '100%', display: 'block' }} />
                  : <span style={{ opacity: 0.5, fontSize: 13 }}>memuat...</span>}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
