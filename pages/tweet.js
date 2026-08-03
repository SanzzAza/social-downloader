import { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Tweet.module.css';

const DEFAULTS = {
  displayName: 'SanzzXD',
  username: 'sanzzxd',
  comment: 'Hello World!',
  avatar: 'https://i.ibb.co/1s8T3sY/48f7ce63c7aa.jpg',
  verified: true,
  theme: 'dark'
};

function buildUrl(values, download = false) {
  const params = new URLSearchParams({
    displayName: values.displayName,
    username: values.username,
    comment: values.comment,
    avatar: values.avatar,
    verified: String(values.verified),
    theme: values.theme,
    ...(download ? { download: 'true' } : {})
  });
  return `/api/tweet?${params.toString()}`;
}

export default function TweetMaker() {
  const [form, setForm] = useState(DEFAULTS);
  const [submitted, setSubmitted] = useState(DEFAULTS);
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [notice, setNotice] = useState('');

  const previewUrl = useMemo(() => buildUrl(submitted), [submitted]);
  const downloadUrl = useMemo(() => buildUrl(submitted, true), [submitted]);

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
    setImageError(false);
    setNotice('');
  }

  function generate(event) {
    event.preventDefault();
    setIsLoading(true);
    setImageError(false);
    setNotice('');

    // Keep the button feedback visible while the browser starts loading the
    // new image. The actual ready state is handled by the image callbacks.
    setSubmitted({ ...form });
  }

  function onImageLoad() {
    setIsLoading(false);
    setNotice('Preview berhasil dibuat.');
  }

  function onImageError() {
    setIsLoading(false);
    setImageError(true);
    setNotice('Gambar gagal dibuat. Coba periksa avatar atau ulangi lagi.');
  }

  return (
    <div className={styles.page}>
      <Head>
        <title>Tweet Canvas Maker | Social Downloader</title>
        <meta
          name="description"
          content="Buat gambar tweet custom dengan display name, username, avatar, verifikasi, dan tema."
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
            <span className={styles.brandIcon}>✎</span>
            <div>
              <p className={styles.eyebrow}>SOCIAL DOWNLOADER / CANVAS</p>
              <h1>TWEET MAKER</h1>
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
              <h2>Rakit tweet kamu</h2>
            </div>
          </div>

          <form onSubmit={generate} className={styles.form}>
            <label className={styles.field}>
              <span>Display name</span>
              <input
                name="displayName"
                value={form.displayName}
                onChange={updateField}
                maxLength={80}
                placeholder="SanzzXD"
                required
              />
            </label>

            <label className={styles.field}>
              <span>Username</span>
              <div className={styles.usernameInput}>
                <b>@</b>
                <input
                  name="username"
                  value={form.username}
                  onChange={updateField}
                  maxLength={50}
                  placeholder="sanzzxd"
                  required
                />
              </div>
            </label>

            <label className={styles.field}>
              <span>Comment</span>
              <textarea
                name="comment"
                value={form.comment}
                onChange={updateField}
                maxLength={280}
                rows={5}
                placeholder="Hello World!"
                required
              />
              <small>{form.comment.length}/280 karakter</small>
            </label>

            <label className={styles.field}>
              <span>Avatar URL <em>HTTPS</em></span>
              <input
                name="avatar"
                type="url"
                value={form.avatar}
                onChange={updateField}
                maxLength={2048}
                placeholder="https://..."
                required
              />
            </label>

            <div className={styles.optionsRow}>
              <label className={styles.checkField}>
                <input
                  name="verified"
                  type="checkbox"
                  checked={form.verified}
                  onChange={updateField}
                />
                <span className={styles.fakeCheck}>✓</span>
                <span>Verified account</span>
              </label>

              <label className={styles.themeField}>
                <span>Tema</span>
                <select name="theme" value={form.theme} onChange={updateField}>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </label>
            </div>

            <button type="submit" className={styles.generateButton} disabled={isLoading}>
              <span>{isLoading ? 'MEMBUAT...' : 'BUAT TWEET'}</span>
              <span>→</span>
            </button>
          </form>

          <p className={styles.disclaimer}>
            Gunakan untuk mockup, demo, atau konten kreatif. Jangan dipakai untuk menyamar
            atau menyebarkan informasi palsu.
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

          <div className={`${styles.previewFrame} ${submitted.theme === 'light' ? styles.lightFrame : ''}`}>
            {imageError ? (
              <div className={styles.errorState}>
                <strong>Gagal memuat gambar</strong>
                <span>Coba ubah data atau tekan BUAT TWEET lagi.</span>
              </div>
            ) : (
              <img
                key={previewUrl}
                src={previewUrl}
                alt={`Tweet dari ${submitted.displayName}`}
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
            <p>{notice || 'Gambar dibuat melalui endpoint canvas.'}</p>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link href="/">← KEMBALI KE SOCIAL DOWNLOADER</Link>
        <span>Siputzx Tweet Canvas API</span>
      </footer>
    </div>
  );
}
