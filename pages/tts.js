import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import styles from '../styles/Home.module.css';

const VOICES = [
  { id: 'en_us_001', name: 'Jessie (Viral Female)', category: 'Popular' },
  { id: 'en_us_006', name: 'Joey (Deep Male)', category: 'Popular' },
  { id: 'en_us_007', name: 'Professor', category: 'Characters' },
  { id: 'en_us_009', name: 'Scientist', category: 'Characters' },
  { id: 'en_us_010', name: 'Confidence', category: 'Popular' },
  { id: 'en_au_001', name: 'Metro (Radio)', category: 'Modern' },
  { id: 'en_uk_001', name: 'Narrator', category: 'Modern' },
  { id: 'en_us_rocket', name: 'Rocket (Guardians)', category: 'Characters' },
  { id: 'en_male_funny', name: 'Funny Male', category: 'Funny' },
  { id: 'en_female_emotional', name: 'Emotional Female', category: 'Funny' },
];

export default function TTSMaker() {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('en_us_001');
  const [loading, setLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState(null);

  const generateTTS = async (e) => {
    e.preventDefault();
    if (!text) return;

    setLoading(true);
    setAudioSrc(null);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice })
      });
      const data = await res.json();
      
      if (data.success) {
        setAudioSrc(`data:audio/mp3;base64,${data.data}`);
      } else {
        alert('Gagal: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (err) {
      console.error(err);
      alert('Koneksi bermasalah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>TikTok TTS Maker - Suara Viral Jadi MP3</title>
        <meta name="description" content="Ubah teks jadi suara viral TikTok (Jessie, Deep Male, dll) secara gratis dan download MP3-nya." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#1A1A2E" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🎙️</span>
          <h1>TTS MAKER</h1>
        </div>
        <p className={styles.tagline}>Ubah teks jadi suara viral TikTok untuk konten kamu</p>

        <nav className={styles.navBar}>
          <Link href="/" className={styles.navLink}>← DOWNLOADER</Link>
          <Link href="/tempmail" className={styles.navLink}>TEMP MAIL</Link>
          <span className={styles.navActive}>TTS MAKER</span>
          <Link href="/ai-image" className={styles.navLink}>AI IMAGE →</Link>
        </nav>

        <div className={styles.decorations}>
          <div className={styles.decoBox}></div>
          <div className={styles.decoBox}></div>
          <div className={styles.decoBox}></div>
        </div>
      </header>

      <main className={styles.mainSingle}>
        <section className={styles.heroSection}>
          <div className={styles.testerCard}>
            <form onSubmit={generateTTS}>
              <div className={styles.formGroup}>
                <label>Pilih Suara</label>
                <select 
                  value={voice} 
                  onChange={(e) => setVoice(e.target.value)}
                  style={{ marginBottom: '15px' }}
                >
                  {VOICES.map(v => (
                    <option key={v.id} value={v.id}>[{v.category}] {v.name}</option>
                  ))}
                </select>
                
                <label>Teks (Maksimal 300 karakter)</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 300))}
                  placeholder="Ketik sesuatu di sini... (Contoh: Halo guys, balik lagi sama gue di sini!)"
                  required
                  style={{
                    width: '100%',
                    padding: '15px',
                    fontSize: '16px',
                    border: '3px solid var(--secondary)',
                    fontFamily: 'inherit',
                    minHeight: '120px',
                    resize: 'vertical'
                  }}
                />
                <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '5px' }}>
                  {text.length}/300 karakter
                </div>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                <span>{loading ? 'MEMPROSES...' : 'GENERATE SUARA'}</span>
                {!loading && <span>🔊</span>}
              </button>
            </form>
          </div>

          {audioSrc && (
            <div className={styles.resultPanel} style={{ display: 'block', borderLeftColor: 'var(--accent)' }}>
              <div className={styles.resultHead}>
                <div className={styles.resultMeta}>
                  <div className={styles.resultTitle}>Suara Berhasil Dibuat!</div>
                  <div className={styles.resultSub}>Silakan dengarkan atau download di bawah ini.</div>
                </div>
              </div>
              
              <div style={{ margin: '20px 0' }}>
                <audio controls src={audioSrc} style={{ width: '100%' }}>
                  Browser kamu tidak mendukung pemutar audio.
                </audio>
              </div>

              <div className={styles.resultLinks}>
                <a 
                  href={audioSrc} 
                  download="tiktok-tts-sanzz.mp3" 
                  className={styles.submitBtn}
                  style={{ textDecoration: 'none', background: 'var(--accent)' }}
                >
                  <span>DOWNLOAD MP3</span>
                  <span>⬇️</span>
                </a>
              </div>
            </div>
          )}
        </section>

        <section className={styles.howSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.titleNumber}>?</span>
            CARA PAKAI
          </h2>
          <div className={styles.stepGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>1</div>
              <p>Pilih karakter suara yang kamu inginkan (Jessie adalah yang paling populer di TikTok).</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>2</div>
              <p>Tulis teks yang ingin diubah menjadi suara. Usahakan pakai tanda baca biar nadanya pas.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>3</div>
              <p>Klik tombol Generate, lalu download hasilnya untuk bahan edit video kamu.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>SOCIAL DOWNLOADER + TTS MAKER</p>
        <p>Gratis · Tanpa Login · Kualitas HD</p>
      </footer>
    </div>
  );
}
