import { useState, useEffect, useCallback } from 'react';
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
    border: '3px solid #16161d',
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
      background: '#f4f4ef',
      minHeight: '100vh',
      padding: '32px 20px'
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            marginBottom: 18,
            border: '3px solid #16161d',
            background: '#fff',
            color: '#16161d',
            padding: '8px 15px',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1,
            textDecoration: 'none',
            boxShadow: '4px 4px 0 #16161d'
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
          gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 380px)',
          gap: 28,
          alignItems: 'start'
        }}>
          {/* ---- controls ---- */}
          <div style={{
            background: '#fff',
            border: '3px solid #16161d',
            boxShadow: '7px 7px 0 #16161d',
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
                      border: '2px solid #16161d',
                      background: title === p ? '#ff5c2b' : '#fff',
                      color: title === p ? '#fff' : '#16161d',
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, ...field }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, ...field }}>
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
                  style={{ width: 20, height: 20, accentColor: '#ff5c2b', cursor: 'pointer' }}
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
                background: '#ff5c2b',
                color: '#fff',
                border: '3px solid #16161d',
                boxShadow: '5px 5px 0 #16161d',
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
              border: '3px solid #16161d',
              boxShadow: '7px 7px 0 #16161d',
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

            <div style={{
              marginTop: 18,
              background: '#16161d',
              color: '#8fe388',
              border: '3px solid #16161d',
              padding: 14,
              fontSize: 11,
              wordBreak: 'break-all'
            }}>
              <div style={{ color: '#fff', fontWeight: 700, marginBottom: 6 }}>API URL</div>
              {buildUrl()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
