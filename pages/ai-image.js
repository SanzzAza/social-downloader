import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import styles from '../styles/Home.module.css';

export default function AIImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [seed, setSeed] = useState(Math.floor(Math.random() * 1000000));

  const generateImage = async (e) => {
    e.preventDefault();
    if (!prompt) return;

    setLoading(true);
    // Logic for width/height based on aspect ratio
    let width = 1024, height = 1024;
    if (aspectRatio === '16:9') { width = 1280; height = 720; }
    if (aspectRatio === '9:16') { width = 720; height = 1280; }

    const newSeed = Math.floor(Math.random() * 1000000);
    setSeed(newSeed);

    try {
      const res = await fetch(`/api/ai-image?prompt=${encodeURIComponent(prompt)}&width=${width}&height=${height}&seed=${newSeed}`);
      const data = await res.json();
      
      if (data.success) {
        setResultImage(data.imageUrl);
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
        <title>AI Image Generator - Bikin Gambar Otomatis dari Teks</title>
        <meta name="description" content="Ubah teks menjadi gambar menakjubkan secara gratis menggunakan AI. Cepat, tanpa login, dan kualitas HD." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#1A1A2E" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🎨</span>
          <h1>AI IMAGE</h1>
        </div>
        <p className={styles.tagline}>Ubah imajinasi kamu menjadi gambar nyata dengan AI</p>

        <nav className={styles.navBar}>
          <Link href="/" className={styles.navLink}>← DOWNLOADER</Link>
          <Link href="/tempmail" className={styles.navLink}>TEMP MAIL</Link>
          <Link href="/tts" className={styles.navLink}>TTS MAKER</Link>
          <span className={styles.navActive}>AI IMAGE</span>
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
            <form onSubmit={generateImage}>
              <div className={styles.formGroup}>
                <label>Deskripsi Gambar (Prompt)</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Contoh: A cyberpunk city with neon lights and flying cars, digital art style..."
                  required
                  style={{
                    width: '100%',
                    padding: '15px',
                    fontSize: '16px',
                    border: '3px solid var(--secondary)',
                    fontFamily: 'inherit',
                    minHeight: '100px',
                    resize: 'vertical',
                    marginBottom: '15px'
                  }}
                />
                
                <label>Rasio Gambar</label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  {['1:1', '16:9', '9:16'].map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        border: '3px solid var(--secondary)',
                        background: aspectRatio === ratio ? 'var(--primary)' : 'white',
                        color: aspectRatio === ratio ? 'white' : 'var(--secondary)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: aspectRatio === ratio ? '3px 3px 0 var(--secondary)' : 'none'
                      }}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                <span>{loading ? 'MENGGAMBAR...' : 'GENERATE GAMBAR'}</span>
                {!loading && <span>✨</span>}
              </button>
            </form>
          </div>

          {loading && (
            <div className={styles.resultPanel} style={{ display: 'block', textAlign: 'center', padding: '60px 20px' }}>
              <div className={styles.resultTitle}>AI sedang menggambar... 🎨</div>
              <div className={styles.resultSub}>Ini biasanya makan waktu 5-10 detik. Jangan di-refresh ya!</div>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                <div className={styles.decoBox} style={{ animation: 'spin 2s linear infinite' }}></div>
              </div>
            </div>
          )}

          {resultImage && (
            <div className={styles.resultPanel} style={{ 
              display: loading ? 'none' : 'block', 
              borderLeftColor: 'var(--accent)' 
            }}>
              <div className={styles.resultHead}>
                <div className={styles.resultMeta}>
                  <div className={styles.resultTitle}>Gambar Berhasil Dibuat!</div>
                  <div className={styles.resultSub}>Prompt: "{prompt}"</div>
                </div>
              </div>
              
              <div style={{ 
                margin: '20px 0', 
                border: '3px solid var(--secondary)', 
                background: '#eee', 
                lineHeight: 0,
                position: 'relative',
                minHeight: '200px'
              }}>
                <img 
                  src={resultImage} 
                  alt={prompt} 
                  style={{ width: '100%', height: 'auto', display: 'block' }} 
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    alert('Gagal memuat gambar. Coba ganti prompt atau rasio.');
                  }}
                />
              </div>

              <div className={styles.resultLinks}>
                <a 
                  href={resultImage} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.submitBtn}
                  style={{ textDecoration: 'none', background: 'var(--accent)' }}
                >
                  <span>BUKA GAMBAR HD</span>
                  <span>🔗</span>
                </a>
              </div>
            </div>
          )}
        </section>

        <section className={styles.howSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.titleNumber}>?</span>
            TIPS PROMPT
          </h2>
          <div className={styles.stepGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>1</div>
              <p>Gunakan Bahasa Inggris untuk hasil yang lebih akurat dan detail.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>2</div>
              <p>Tambahkan gaya seni seperti "Digital Art", "Oil Painting", atau "Realistic Photo".</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>3</div>
              <p>Berikan detail pencahayaan seperti "Cinematic lighting" atau "Neon glow".</p>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>SOCIAL DOWNLOADER + AI IMAGE</p>
        <p>Gratis · Unlimited · Kualitas Tinggi</p>
      </footer>
    </div>
  );
}
