import Head from 'next/head';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import styles from '../styles/Home.module.css';

export default function VideoMaker() {
  const [text, setText] = useState('KONTEN VIDEO OTOMATIS');
  const [subtext, setSubtext] = useState('Dibuat dengan HyperFrames Lite');
  const [bgColor, setBgColor] = useState('#FF6B35');
  const [textColor, setTextColor] = useState('#ffffff');
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const canvasRef = useRef(null);
  const requestRef = useRef();
  
  // Animation settings
  const duration = 5000; // 5 seconds
  const fps = 30;
  
  const drawFrame = (ctx, time, width, height) => {
    // Clear background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    // Draw Animated Decorative Boxes (Neo Brutalism Style)
    const boxSize = 100;
    const boxX = (time / duration) * (width + boxSize) - boxSize;
    ctx.strokeStyle = '#1A1A2E';
    ctx.lineWidth = 5;
    ctx.strokeRect(boxX, height * 0.2, boxSize, boxSize);
    ctx.strokeRect(width - boxX - boxSize, height * 0.7, boxSize, boxSize);

    // Text Animation Logic
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Main Text (Scaling effect)
    const scale = 1 + Math.sin((time / 500) * Math.PI) * 0.05;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    
    ctx.font = 'bold 60px "Space Mono", monospace';
    ctx.fillStyle = '#1A1A2E'; // Shadow
    ctx.fillText(text.toUpperCase(), 5, 5);
    
    ctx.fillStyle = textColor;
    ctx.strokeStyle = '#1A1A2E';
    ctx.lineWidth = 3;
    ctx.fillText(text.toUpperCase(), 0, 0);
    ctx.strokeText(text.toUpperCase(), 0, 0);
    ctx.restore();

    // Subtext (Slide up effect)
    const subAlpha = Math.min(1, time / 1000);
    ctx.globalAlpha = subAlpha;
    ctx.font = '24px "IBM Plex Sans", sans-serif';
    ctx.fillStyle = '#1A1A2E';
    ctx.fillText(subtext, width / 2, height / 2 + 80);
    ctx.globalAlpha = 1.0;
  };

  const animate = (time) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const currentTime = Date.now() % duration;
    
    drawFrame(ctx, currentTime, canvas.width, canvas.height);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [text, subtext, bgColor, textColor]);

  const startRender = async () => {
    setIsRendering(true);
    setProgress(0);
    
    const canvas = canvasRef.current;
    const stream = canvas.captureStream(fps);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5000000 // 5Mbps for high quality
    });

    const chunks = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hyperframe-${Date.now()}.webm`;
      a.click();
      setIsRendering(false);
      setProgress(0);
    };

    mediaRecorder.start();

    // Track progress
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(p);
      
      if (elapsed >= duration) {
        clearInterval(interval);
        mediaRecorder.stop();
      }
    }, 100);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>HyperFrames Lite - Bikin Video Animasi dari Kodingan</title>
        <meta name="description" content="Generate video pendek secara otomatis untuk TikTok/Reels dengan HTML5 & Canvas." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#1A1A2E" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🎬</span>
          <h1>HYPERFRAMES</h1>
        </div>
        <p className={styles.tagline}>Bikin video animasi otomatis tanpa software editing</p>

        <nav className={styles.navBar}>
          <Link href="/" className={styles.navLink}>← DOWNLOADER</Link>
          <Link href="/sticker" className={styles.navLink}>STICKER</Link>
          <Link href="/tempmail" className={styles.navLink}>TEMP MAIL</Link>
          <Link href="/tts" className={styles.navLink}>TTS MAKER</Link>
          <span className={styles.navActive}>VIDEO MAKER</span>
        </nav>
      </header>

      <main className={styles.mainSingle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '30px' }}>
          {/* Controls */}
          <section>
            <div className={styles.testerCard}>
              <div className={styles.formGroup}>
                <label>Teks Utama</label>
                <input 
                  type="text" 
                  value={text} 
                  onChange={(e) => setText(e.target.value)} 
                  maxLength={30}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Subteks (Keterangan)</label>
                <input 
                  type="text" 
                  value={subtext} 
                  onChange={(e) => setSubtext(e.target.value)} 
                  maxLength={50}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className={styles.formGroup}>
                  <label>Warna BG</label>
                  <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{height: '50px'}} />
                </div>
                <div className={styles.formGroup}>
                  <label>Warna Teks</label>
                  <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{height: '50px'}} />
                </div>
              </div>
              
              <button 
                onClick={startRender} 
                className={styles.submitBtn} 
                disabled={isRendering}
                style={{ background: isRendering ? '#ccc' : 'var(--primary)' }}
              >
                <span>{isRendering ? `RENDERING ${progress}%` : 'PROSES JADI VIDEO'}</span>
                {!isRendering && <span>🚀</span>}
              </button>
            </div>

            <div className={styles.howSection}>
               <h2 className={styles.sectionTitle} style={{fontSize: '18px'}}>PRO TIPS</h2>
               <p style={{fontSize: '14px', color: '#666'}}>
                 Gunakan teks yang singkat agar terbaca jelas. Video berdurasi 5 detik, cocok untuk story IG atau selingan video TikTok.
               </p>
            </div>
          </section>

          {/* Preview Canvas */}
          <section>
            <div style={{ 
              border: '4px solid #1A1A2E', 
              boxShadow: '10px 10px 0 #1A1A2E',
              background: '#000',
              lineHeight: 0,
              position: 'sticky',
              top: '20px'
            }}>
              <canvas 
                ref={canvasRef} 
                width={720} 
                height={1280} 
                style={{ 
                  width: '100%', 
                  height: 'auto', 
                  display: 'block' 
                }}
              />
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                padding: '4px 8px',
                fontSize: '10px',
                fontFamily: 'monospace'
              }}>
                PREVIEW 9:16
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>SOCIAL DOWNLOADER + HYPERFRAMES LITE</p>
        <p>Render video langsung di browser kamu.</p>
      </footer>
    </div>
  );
}
