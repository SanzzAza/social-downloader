import { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Tweet.module.css';

const DEFAULTS = {
  text: 'SanzzXD',
  delay: '500'
};

function buildUrl(values, download = false) {
  const params = new URLSearchParams({
    text: values.text,
    delay: String(values.delay),
    ...(download ? { download: 'true' } : {})
  });
  return `/api/brat?${params.toString()}`;
}

export default function BratMaker() {
  const [form, setForm] = useState(DEFAULTS);
  const [submitted, setSubmitted] = useState(DEFAULTS);
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [notice, setNotice] = useState('');

  const previewUrl = useMemo(() => buildUrl(submitted), [submitted]);
  const downloadUrl = useMemo(() => buildUrl(submitted, true), [submitted]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setImageError(false);
    setNotice('');
  }

  function generate(event) {
    event.preventDefault();
    if (!form.text.trim()) return;
    setIsLoading(true);
    setImageError(false);
    setNotice('');
    setSubmitted({ ...form, text: form.text.trim() });
  }

  function onImageLoad() {
    setIsLoading(false);
    setNotice('Brat berhasil dibuat.');
  }

  function onImageError() {
    setIsLoading(false);
    setImageError(true);
    setNotice('Gambar gagal dibuat. Coba ulangi lagi.');
  }

  return (
    <div className={styles.page}>
      <Head>
        <title>Brat Maker | Social Downloader</title>
        <meta
          name="description"
          content="Buat gambar Brat custom dari teks kamu sendiri."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#F7F7F7" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.backLink}>← ALL TOOLS</Link>
          <div className={styles.brand}>
            <span className={styles.brandIcon}>✦</span>
            <div>
              <p className={styles.eyebrow}>SOCIAL DOWNLOADER / CANVAS</p>
              <h1>BRAT MAKER</h1>
            </div>
          </div>
          <span className={styles.badge}>PNG</span>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.editorCard}>
          <div className={styles.cardTop}>
            <span className={styles.number}>01</span>
            <div>
              <p className={styles.sectionKicker}>EDITOR</p>
              <h2>Tulis teks Brat</h2>
            </div>
          </div>

          <form onSubmit={generate} className={styles.form}>
            <label className={styles.field}>
              <span>Text</span>
              <textarea
                name="text"
                value={form.text}
                onChange={updateField}
                maxLength={200}
                rows={5}
                placeholder="SanzzXD"
                required
              />
              <small>{form.text.length}/200 karakter</small>
            </label>

            <label className={styles.field}>
              <span>Delay <em>MILIDETIK</em></span>
              <input
                name="delay"
                type="number"
                min="0"
                max="5000"
                step="50"
                value={form.delay}
                onChange={updateField}
              />
              <small>Semakin besar, proses dari provider bisa lebih lama.</small>
            </label>

            <button type="submit" className={styles.generateButton} disabled={isLoading || !form.text.trim()}>
              <span>{isLoading ? 'MEMBUAT...' : 'BUAT BRAT'}</span>
              <span>→</span>
            </button>
          </form>

          <p className={styles.disclaimer}>
            Gunakan untuk meme dan konten kreatif. Hasil dibuat dalam format PNG 700×700.
          </p>
        </section>

        <section className={styles.previewCard}>
          <div className={styles.cardTop}>
            <span className={`${styles.number} ${styles.numberGreen}`}>02</span>
            <div>
              <p className={styles.sectionKicker}>PREVIEW</p>
              <h2>Hasil gambar</h2>
            </div>
          </div>

          <div className={styles.previewFrame}>
            {imageError ? (
              <div className={styles.errorState}>
                <strong>Gagal memuat gambar</strong>
                <span>Tekan BUAT BRAT untuk mencoba lagi.</span>
              </div>
            ) : (
              <img
                key={previewUrl}
                src={previewUrl}
                alt={`Brat ${submitted.text}`}
                onLoad={onImageLoad}
                onError={onImageError}
              />
            )}
            {isLoading && !imageError && <div className={styles.loadingOverlay}>MEMPROSES...</div>}
          </div>

          <div className={styles.previewActions}>
            <a href={downloadUrl} className={styles.downloadButton}>
              DOWNLOAD PNG <span>↓</span>
            </a>
            <p>{notice || 'Gambar dibuat melalui endpoint Brat canvas.'}</p>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link href="/">← KEMBALI KE SOCIAL DOWNLOADER</Link>
        <span>Siputzx Brat API</span>
      </footer>
    </div>
  );
}
