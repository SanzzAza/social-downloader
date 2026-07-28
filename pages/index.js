import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Social Downloader API - TikTok, Instagram, Facebook, X, Threads</title>
        <meta name="description" content="API gratis untuk download video TikTok, Instagram Reels, Facebook, Twitter/X dan Threads tanpa watermark. Plus generator stiker WhatsApp." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Social Downloader API" />
        <meta property="og:description" content="Download video TikTok, Instagram, Facebook, X, Threads lewat satu API." />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⬇</span>
          <h1>SOCIAL DOWNLOADER API</h1>
        </div>
        <p className={styles.tagline}>RESTful API for downloading social media content</p>

        <nav className={styles.navBar}>
          <span className={styles.navActive}>DOWNLOADER</span>
          <Link href="/sticker" className={styles.navLink}>
            STICKER MAKER →
          </Link>
        </nav>

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

          <div id="resultPanel" className={styles.resultPanel} style={{display: 'none'}}>
            <div className={styles.resultHead}>
              <img id="resultThumb" className={styles.resultThumb} alt="" />
              <div className={styles.resultMeta}>
                <div id="resultTitle" className={styles.resultTitle}></div>
                <div id="resultSub" className={styles.resultSub}></div>
              </div>
            </div>
            <div id="resultLinks" className={styles.resultLinks}></div>
          </div>

          <div className={styles.responseSection}>
            <h3>API Response</h3>
            <button id="copyResponse" className={styles.copyBtn}>Copy JSON</button>
            <pre id="responseViewer"><span className={styles.placeholder}>Response will appear here...</span></pre>
          </div>
        </section>

        <section className={styles.stickerSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.titleNumber}>03</span>
            STICKER MAKER
          </h2>

          <div className={styles.stickerCard}>
            <div className={styles.stickerInfo}>
              <h3 className={styles.stickerHeading}>Bikin stiker WhatsApp custom</h3>
              <p className={styles.stickerDesc}>
                Template jendela Windows XP — tinggal ketik teksnya. Output WebP
                512×512 transparan, otomatis di bawah 100 KB, siap dipakai jadi
                stiker WhatsApp.
              </p>

              <div className={styles.endpointHeader}>
                <span className={styles.methodBadge}>GET</span>
                <code className={styles.endpointPath}>/api/sticker?text=HALO</code>
              </div>

              <Link href="/sticker" className={styles.stickerBtn}>
                BUKA STICKER MAKER →
              </Link>
            </div>

            <div className={styles.stickerPreview}>
              <img
                src="/api/sticker?text=NYARI%20STIKER%20WA%3F&format=png"
                alt="Contoh stiker Windows XP"
                width={512}
                height={512}
              />
            </div>
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
          const btn = e.target.querySelector('button[type="submit"]');
          const original = btn.textContent;
          btn.disabled = true;
          btn.textContent = 'MEMPROSES...';

          try {
            const res = await fetch('/api/download', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, platform: platform || undefined })
            });
            const data = await res.json();
            document.getElementById('responseViewer').innerHTML = highlightJSON(JSON.stringify(data, null, 2));
            renderResult(data, res.status);
          } catch (err) {
            document.getElementById('responseViewer').innerHTML = '<span style="color:#E63946">Network error: ' + err.message + '</span>';
            hideResult();
          } finally {
            btn.disabled = false;
            btn.textContent = original;
          }
        });

        function hideResult() {
          document.getElementById('resultPanel').style.display = 'none';
        }

        function labelFor(item, index, seen) {
          if (item.type === 'audio') return 'AUDIO MP3';
          if (item.type === 'image') return 'GAMBAR ' + (index + 1);
          if (item.quality === 'no-watermark') {
            // TikTok returns both SD and HD as 'no-watermark'; number them.
            seen.nowm = (seen.nowm || 0) + 1;
            return seen.nowm === 1 ? 'VIDEO NO WATERMARK' : 'VIDEO HD NO WATERMARK';
          }
          if (item.quality === 'watermark') return 'VIDEO (ADA WATERMARK)';
          if (item.quality === 'hd') return 'VIDEO HD';
          if (item.quality === 'sd') return 'VIDEO SD';
          return 'VIDEO ' + (index + 1);
        }

        function renderResult(data, status) {
          const panel = document.getElementById('resultPanel');
          const links = document.getElementById('resultLinks');

          if (!data || !data.success) {
            const msg = status === 429
              ? (data.error && data.error.message) || 'Terlalu banyak request, tunggu sebentar.'
              : (data.error && data.error.message) || 'Gagal mengambil media.';
            panel.style.display = 'block';
            document.getElementById('resultThumb').style.display = 'none';
            document.getElementById('resultTitle').textContent = status === 429 ? 'Kena rate limit' : 'Gagal';
            document.getElementById('resultSub').textContent = msg;
            links.innerHTML = '';
            return;
          }

          const d = data.data || {};
          const media = Array.isArray(d.media) && d.media.length
            ? d.media
            : (d.downloadUrl ? [{ type: d.type || 'video', url: d.downloadUrl }] : []);

          if (!media.length) { hideResult(); return; }

          const thumb = document.getElementById('resultThumb');
          if (d.thumbnail) {
            thumb.src = d.thumbnail;
            thumb.style.display = 'block';
          } else {
            thumb.style.display = 'none';
          }

          document.getElementById('resultTitle').textContent = d.title || 'Media siap diunduh';
          const who = d.author && (d.author.name || d.author.username);
          document.getElementById('resultSub').textContent =
            [who ? '@' + who : '', data.platform, d.source ? 'via ' + d.source : '']
              .filter(Boolean).join(' \\u00b7 ');

          // Route through /api/proxy so the file downloads directly and the
          // expiring CDN URL is not handed to the user.
          const seen = {};
          links.innerHTML = media.map((item, i) => {
            const name = (d.id || 'media') + '-' + (i + 1) + '.' +
              (item.type === 'image' ? 'jpg' : item.type === 'audio' ? 'mp3' : 'mp4');
            const href = '/api/proxy?url=' + encodeURIComponent(item.url) +
              '&filename=' + encodeURIComponent(name);
            return '<a class="dlbtn" href="' + href + '">' + labelFor(item, i, seen) + ' \\u2193</a>';
          }).join('');

          panel.style.display = 'block';
        }

        document.getElementById('copyResponse').addEventListener('click', () => {
          navigator.clipboard.writeText(document.getElementById('responseViewer').textContent);
          document.getElementById('copyResponse').textContent = 'Copied!';
          setTimeout(() => document.getElementById('copyResponse').textContent = 'Copy JSON', 2000);
        });
      `}} />
    </div>
  );
}
