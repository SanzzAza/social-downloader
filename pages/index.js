import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Social Downloader - Download Video YouTube, TikTok, Instagram, Facebook, X</title>
        <meta name="description" content="Download video YouTube (MP4/MP3), TikTok tanpa watermark, Instagram Reels, Facebook, Twitter/X dan Threads. Gratis, tanpa aplikasi, tanpa login." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#1A1A2E" />
        <meta property="og:title" content="Social Downloader" />
        <meta property="og:description" content="Download video TikTok, Instagram, Facebook, X, Threads. Gratis dan cepat." />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⬇</span>
          <h1>SOCIAL DOWNLOADER</h1>
        </div>
        <p className={styles.tagline}>Download video dari YouTube, TikTok, Instagram, Facebook, X &amp; Threads</p>

        <nav className={styles.navBar}>
          <span className={styles.navActive}>DOWNLOADER</span>
          <Link href="/sticker" className={styles.navLink}>
            STICKER MAKER →
          </Link>
          <Link href="/tempmail" className={styles.navLink}>
            TEMP MAIL →
          </Link>
          <Link href="/tts" className={styles.navLink}>
            TTS MAKER →
          </Link>
          <Link href="/video-maker" className={styles.navLink}>
            VIDEO MAKER →
          </Link>
          <Link href="/chat-mockup" className={styles.navLink}>
            CHAT MOCKUP →
          </Link>
          <Link href="/tweet" className={styles.navLink}>
            TWEET MAKER →
          </Link>
          <Link href="/brat" className={styles.navLink}>
            BRAT MAKER →
          </Link>
          <Link href="/ektp" className={styles.navLink}>
            E-KTP MOCKUP →
          </Link>
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
            <form id="downloadForm">
              <div className={styles.formGroup}>
                <label>Tempel link video di sini</label>
                <input
                  type="url"
                  id="urlInput"
                  placeholder="https://youtube.com/watch?v=... atau link TikTok/IG/FB/X"
                  required
                />
              </div>

              <button type="submit" className={styles.submitBtn}>
                <span>DOWNLOAD</span>
                <span>⬇</span>
              </button>
            </form>

            <div className={styles.detectedInfo} id="detectedInfo" style={{display: 'none'}}>
              Terdeteksi: <span className={styles.detectedPlatform} id="detectedPlatform"></span>
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
            <div id="previewBox" className={styles.previewBox} style={{display: 'none'}}></div>
            <div id="resultLinks" className={styles.resultLinks}></div>
          </div>

            <div className={styles.platformStrip}>
            <span className={styles.platformStripLabel}>Didukung:</span>
            <span className={styles.platformChip}>TikTok</span>
            <span className={styles.platformChip}>Instagram</span>
            <span className={styles.platformChip}>Facebook</span>
            <span className={styles.platformChip}>Twitter/X</span>
            <span className={styles.platformChip}>Threads</span>
            <span className={styles.platformChip}>YouTube</span>
            <span className={styles.platformChip}>Pinterest</span>
            <span className={styles.platformChip}>CapCut</span>
          </div>
        </section>

        <section className={styles.howSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.titleNumber}>?</span>
            CARA PAKAI
          </h2>
          <div className={styles.stepGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>1</div>
              <p>Salin link video dari YouTube, TikTok, Instagram, Facebook, X atau Threads.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>2</div>
              <p>Tempel link di kolom atas, lalu tekan tombol DOWNLOAD.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>3</div>
              <p>Pilih kualitas yang muncul, file langsung tersimpan di perangkat.</p>
            </div>
          </div>
        </section>

        <section className={styles.stickerSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.titleNumber}>+</span>
            BONUS: STICKER MAKER
          </h2>

          <div className={styles.stickerCard}>
            <div className={styles.stickerInfo}>
              <h3 className={styles.stickerHeading}>Bikin stiker WhatsApp custom</h3>
              <p className={styles.stickerDesc}>
                Template jendela Windows XP — tinggal ketik teksnya. Hasilnya
                WebP 512×512 transparan, siap dipakai jadi stiker WhatsApp.
              </p>

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
        <p>SOCIAL DOWNLOADER</p>
        <p>Gratis · Tanpa login · Tanpa iklan</p>
      </footer>

      <script dangerouslySetInnerHTML={{ __html: `
        const patterns = {
          tiktok: /tiktok[.]com|vm[.]tiktok[.]com/i,
          instagram: /instagram[.]com/i,
          facebook: /facebook[.]com|fb[.]watch/i,
          twitter: /twitter[.]com|x[.]com/i,
          threads: /threads[.]net|threads[.]com/i,
          youtube: /youtube[.]com|youtu[.]be/i,
          pinterest: /pinterest[.]com|pin[.]it/i,
          capcut: /capcut[.]com/i
        };

        const NICE = {
          tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook',
          twitter: 'Twitter/X', threads: 'Threads', youtube: 'YouTube',
          pinterest: 'Pinterest', capcut: 'CapCut'
        };

        function detectPlatform(url) {
          for (const [p, r] of Object.entries(patterns)) {
            if (r.test(url)) return p;
          }
          return null;
        }

        document.getElementById('urlInput').addEventListener('input', e => {
          const p = detectPlatform(e.target.value);
          const info = document.getElementById('detectedInfo');
          if (p) {
            info.style.display = 'flex';
            document.getElementById('detectedPlatform').textContent = NICE[p] || p;
          } else {
            info.style.display = 'none';
          }
        });

        document.getElementById('downloadForm').addEventListener('submit', async e => {
          e.preventDefault();
          const url = document.getElementById('urlInput').value.trim();
          const btn = e.target.querySelector('button[type="submit"]');
          btn.disabled = true;
          btn.innerHTML = '<span>MEMPROSES...</span>';
          showLoading();

          try {
            const res = await fetch('/api/download', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url })
            });
            const data = await res.json();
            renderResult(data, res.status);
          } catch (err) {
            showError('Koneksi bermasalah', 'Cek jaringan kamu lalu coba lagi.');
          } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>DOWNLOAD</span><span>⬇</span>';
          }
        });

        function hidePreview() {
          const box = document.getElementById('previewBox');
          box.innerHTML = '';
          box.style.display = 'none';
        }

        function showLoading() {
          const panel = document.getElementById('resultPanel');
          hidePreview();
          document.getElementById('resultThumb').style.display = 'none';
          document.getElementById('resultTitle').textContent = 'Mengambil media...';
          document.getElementById('resultSub').textContent = 'Tunggu sebentar ya.';
          document.getElementById('resultLinks').innerHTML = '';
          panel.style.display = 'block';
        }

        function showError(title, message) {
          hidePreview();
          document.getElementById('resultThumb').style.display = 'none';
          document.getElementById('resultTitle').textContent = title;
          document.getElementById('resultSub').textContent = message;
          document.getElementById('resultLinks').innerHTML = '';
          document.getElementById('resultPanel').style.display = 'block';
        }

        function labelFor(item, index, seen) {
          const size = item.size ? ' (' + item.size + ')' : '';
          if (item.type === 'audio') {
            const fmt = (item.format || 'mp3').toUpperCase();
            return 'AUDIO ' + fmt + (item.quality ? ' ' + item.quality : '') + size;
          }
          if (item.hasAudio && item.quality && /\\d+p/.test(item.quality)) {
            return 'VIDEO MP4 ' + item.quality + size;
          }
          if (item.type === 'image') return 'GAMBAR ' + (index + 1);
          if (item.quality === 'no-watermark') {
            seen.nowm = (seen.nowm || 0) + 1;
            return seen.nowm === 1 ? 'VIDEO NO WATERMARK' : 'VIDEO HD NO WATERMARK';
          }
          if (item.quality === 'watermark') return 'VIDEO (ADA WATERMARK)';
          if (item.quality === 'hd') return 'VIDEO HD';
          if (item.quality === 'sd') return 'VIDEO SD';
          return 'VIDEO ' + (index + 1);
        }

        function renderResult(data, status) {
          const links = document.getElementById('resultLinks');

          if (!data || !data.success) {
            const msg = (data && data.error && data.error.message) || 'Coba link lain ya.';
            showError(
              status === 429 ? 'Terlalu banyak permintaan' : 'Media tidak ditemukan',
              msg
            );
            return;
          }

          const d = data.data || {};
          const media = Array.isArray(d.media) && d.media.length
            ? d.media
            : (d.downloadUrl ? [{ type: d.type || 'video', url: d.downloadUrl }] : []);

          if (!media.length) {
            showError('Media tidak ditemukan', 'Postingan mungkin private atau sudah dihapus.');
            return;
          }

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
            [who ? '@' + who : '', NICE[data.platform] || data.platform]
              .filter(Boolean).join(' · ');

          // Preview the first item inline. Uses inline=1 so the proxy sends
          // Content-Disposition: inline instead of forcing a download.
          const box = document.getElementById('previewBox');
          const first = media[0];
          const preview = '/api/proxy?url=' + encodeURIComponent(first.url) + '&inline=1';

          if (first.type === 'image') {
            box.innerHTML = '<img class="pvmedia" src="' + preview + '" alt="preview" />';
            box.style.display = 'block';
          } else if (first.type === 'video') {
            box.innerHTML = '<video class="pvmedia" controls playsinline preload="metadata"' +
              (d.thumbnail ? ' poster="' + d.thumbnail + '"' : '') +
              ' src="' + preview + '"></video>';
            box.style.display = 'block';
          } else {
            hidePreview();
          }

          const seen = {};
          links.innerHTML = media.map((item, i) => {
            const name = (d.id || 'media') + '-' + (i + 1) + '.' +
              (item.type === 'image' ? 'jpg' : item.type === 'audio' ? 'mp3' : 'mp4');
            const href = '/api/proxy?url=' + encodeURIComponent(item.url) +
              '&filename=' + encodeURIComponent(name);
            return '<a class="dlbtn" href="' + href + '">' + labelFor(item, i, seen) + ' ↓</a>';
          }).join('');

          document.getElementById('resultPanel').style.display = 'block';
        }
      `}} />
    </div>
  );
}
