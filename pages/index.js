import Head from 'next/head';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Social Downloader API</title>
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⬇</span>
          <h1>SOCIAL DOWNLOADER API</h1>
        </div>
        <p className={styles.tagline}>RESTful API for downloading social media content</p>
        <div className={styles.decorations}>
          <div className={styles.decoBox}></div>
          <div className={styles.decoBox}></div>
          <div className={styles.decoBox}></div>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.docsSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.titleNumber}>01</span>
            API DOCUMENTATION
          </h2>

          <div className={styles.endpointCard}>
            <div className={styles.endpointHeader}>
              <span className={styles.methodBadge}>POST</span>
              <code>/api/download</code>
            </div>
            <p>Download media from supported social platforms</p>
            <pre className={styles.codeBlock}>{`{
  "url": "https://tiktok.com/@user/video/123",
  "platform": "tiktok"
}`}</pre>
          </div>

          <h3>Supported Platforms</h3>
          <div className={styles.platformGrid}>
            <div className={styles.platformItem}>🎵 TikTok</div>
            <div className={styles.platformItem}>📷 Instagram</div>
            <div className={styles.platformItem}>👥 Facebook</div>
            <div className={styles.platformItem}>🐦 Twitter/X</div>
            <div className={styles.platformItem}>🧵 Threads</div>
          </div>

          <h3>Response Format</h3>
          <pre className={styles.codeBlock}>{`{
  "success": true,
  "platform": "tiktok",
  "data": {
    "id": "7312345678901234567",
    "title": "Video title",
    "author": { "name": "username" },
    "media": [{ "type": "video", "url": "..." }],
    "downloadUrl": "..."
  }
}`}</pre>
        </section>

        <section className={styles.testerSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.titleNumber}>02</span>
            LIVE API TESTER
          </h2>

          <div className={styles.testerCard}>
            <form id="downloadForm">
              <div className={styles.formGroup}>
                <label>Media URL</label>
                <input type="url" id="urlInput" placeholder="https://tiktok.com/@user/video/123" required />
              </div>
              <div className={styles.formGroup}>
                <label>Platform</label>
                <select id="platformSelect">
                  <option value="">Auto-detect</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="twitter">Twitter/X</option>
                  <option value="threads">Threads</option>
                </select>
              </div>
              <button type="submit" className={styles.submitBtn}>
                <span>Download</span>
                <span>⬇</span>
              </button>
            </form>

            <div className={styles.detectedInfo} id="detectedInfo" style={{display: 'none'}}>
              Detected: <span className={styles.detectedPlatform} id="detectedPlatform"></span>
            </div>
          </div>

          <div className={styles.responseSection}>
            <h3>API Response</h3>
            <button id="copyResponse" className={styles.copyBtn}>Copy JSON</button>
            <pre id="responseViewer"><span className={styles.placeholder}>Response will appear here...</span></pre>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>SOCIAL DOWNLOADER API v1.0.0</p>
        <p>Built with Neo Brutalism Design</p>
      </footer>

      <script dangerouslySetInnerHTML={{ __html: `
        const patterns = {
          tiktok: /tiktok\\.com|vm\\.tiktok\\.com/i,
          instagram: /instagram\\.com/i,
          facebook: /facebook\\.com|fb\\.watch/i,
          twitter: /twitter\\.com|x\\.com/i,
          threads: /threads\\.net|threads\\.com/i
        };

        function detectPlatform(url) {
          for (const [p, r] of Object.entries(patterns)) {
            if (r.test(url)) return p;
          }
          return null;
        }

        function highlightJSON(json) {
          return json.replace(/(".*?":|true|false|null|-?\\d+(?:\\.\\d*)?)/g, m => {
            if (/^"/.test(m)) {
              return m.includes(':') 
                ? '<span style="color:#16C79A">'+m.slice(0,-1)+'</span>:' 
                : '<span style="color:#FFD93D">'+m+'</span>';
            }
            return '<span style="color:#FF6B35">'+m+'</span>';
          });
        }

        document.getElementById('urlInput').addEventListener('input', e => {
          const p = detectPlatform(e.target.value);
          const info = document.getElementById('detectedInfo');
          if (p) {
            info.style.display = 'flex';
            document.getElementById('detectedPlatform').textContent = p;
          } else {
            info.style.display = 'none';
          }
        });

        document.getElementById('downloadForm').addEventListener('submit', async e => {
          e.preventDefault();
          const url = document.getElementById('urlInput').value.trim();
          const platform = document.getElementById('platformSelect').value;
          
          try {
            const res = await fetch('/api/download', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, platform: platform || undefined })
            });
            const data = await res.json();
            document.getElementById('responseViewer').innerHTML = highlightJSON(JSON.stringify(data, null, 2));
          } catch (err) {
            document.getElementById('responseViewer').innerHTML = '<span style="color:#E63946">Network error: ' + err.message + '</span>';
          }
        });

        document.getElementById('copyResponse').addEventListener('click', () => {
          navigator.clipboard.writeText(document.getElementById('responseViewer').textContent);
          document.getElementById('copyResponse').textContent = 'Copied!';
          setTimeout(() => document.getElementById('copyResponse').textContent = 'Copy JSON', 2000);
        });
      `}} />
    </div>
  );
}
