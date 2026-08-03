import { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Tweet.module.css';

const DEFAULTS = {
  provinsi: 'JAWA BARAT',
  kota: 'BANDUNG',
  nik: '0000000000000000',
  nama: 'John Doe',
  ttl: 'Bandung, 01-01-1990',
  jenis_kelamin: 'Laki-laki',
  golongan_darah: 'O',
  alamat: 'Jl. Contoh No. 123',
  'rt/rw': '001/002',
  'kel/desa': 'Sukajadi',
  kecamatan: 'Sukajadi',
  agama: 'Islam',
  status: 'Belum Kawin',
  pekerjaan: 'Pegawai Swasta',
  kewarganegaraan: 'WNI',
  masa_berlaku: 'Seumur Hidup',
  terbuat: '01-01-2023',
  pas_photo: 'https://cdn.phototourl.com/free/2026-08-03-0257667d-e703-446e-a81d-ca5f0fa18fe3.png'
};

const FIELDS = [
  ['provinsi', 'Provinsi'],
  ['kota', 'Kota / Kabupaten'],
  ['nama', 'Nama'],
  ['ttl', 'Tempat, tanggal lahir'],
  ['jenis_kelamin', 'Jenis kelamin'],
  ['golongan_darah', 'Golongan darah'],
  ['alamat', 'Alamat'],
  ['rt/rw', 'RT / RW'],
  ['kel/desa', 'Kelurahan / Desa'],
  ['kecamatan', 'Kecamatan'],
  ['agama', 'Agama'],
  ['status', 'Status perkawinan'],
  ['pekerjaan', 'Pekerjaan'],
  ['kewarganegaraan', 'Kewarganegaraan'],
  ['masa_berlaku', 'Masa berlaku'],
  ['terbuat', 'Terbuat']
];

function buildUrl(values, download = false) {
  const params = new URLSearchParams({
    ...values,
    ...(download ? { download: 'true' } : {})
  });
  return `/api/ektp?${params.toString()}`;
}

export default function EktpMockup() {
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
    setIsLoading(true);
    setImageError(false);
    setNotice('');
    setSubmitted({ ...form });
  }

  function onImageLoad() {
    setIsLoading(false);
    setNotice('Mockup berhasil dibuat (bersih tanpa garis merah).');
  }

  function onImageError() {
    setIsLoading(false);
    setImageError(true);
    setNotice('Gambar gagal dibuat. Coba ulangi lagi.');
  }

  return (
    <div className={styles.page}>
      <Head>
        <title>e-KTP Mockup Demo | Social Downloader</title>
        <meta
          name="description"
          content="Buat mockup e-KTP untuk demo UI dengan watermark CONTOH dan TIDAK BERLAKU."
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
            <span className={styles.brandIcon}>▣</span>
            <div>
              <p className={styles.eyebrow}>SOCIAL DOWNLOADER / MOCKUP</p>
              <h1>E-KTP DEMO</h1>
            </div>
          </div>
          <span className={styles.badge}>DEMO ONLY</span>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.editorCard}>
          <div className={styles.cardTop}>
            <span className={styles.number}>01</span>
            <div>
              <p className={styles.sectionKicker}>EDITOR</p>
              <h2>Data mockup</h2>
            </div>
          </div>

          <p className={styles.disclaimer}>
            Ini hanya untuk demo UI. Garis merah sudah dihilangkan.
            NIK bisa di-custom (hanya untuk demo).
          </p>

          <form onSubmit={generate} className={styles.form}>
            <label className={styles.field}>
              <span>NIK <em>(bebas custom)</em></span>
              <input 
                name="nik" 
                value={form.nik} 
                onChange={updateField} 
                maxLength={20}
                placeholder="16 digit NIK" 
              />
            </label>

            {FIELDS.map(([name, label]) => (
              <label className={styles.field} key={name}>
                <span>{label}</span>
                {name === 'alamat' ? (
                  <textarea
                    name={name}
                    value={form[name]}
                    onChange={updateField}
                    maxLength={160}
                    rows={3}
                  />
                ) : (
                  <input
                    name={name}
                    value={form[name]}
                    onChange={updateField}
                    maxLength={160}
                    required
                  />
                )}
              </label>
            ))}

            <label className={styles.field}>
              <span>Foto contoh <em>HTTPS</em></span>
              <input
                name="pas_photo"
                type="url"
                value={form.pas_photo}
                onChange={updateField}
                maxLength={2048}
                required
              />
            </label>

            <button type="submit" className={styles.generateButton} disabled={isLoading}>
              <span>{isLoading ? 'MEMBUAT...' : 'BUAT MOCKUP'}</span>
              <span>→</span>
            </button>
          </form>
        </section>

        <section className={styles.previewCard}>
          <div className={styles.cardTop}>
            <span className={`${styles.number} ${styles.numberGreen}`}>02</span>
            <div>
              <p className={styles.sectionKicker}>PREVIEW</p>
              <h2>Hasil demo</h2>
            </div>
          </div>

          <div className={styles.previewFrame}>
            {imageError ? (
              <div className={styles.errorState}>
                <strong>Gagal memuat mockup</strong>
                <span>Tekan BUAT MOCKUP untuk mencoba lagi.</span>
              </div>
            ) : (
              <img
                key={previewUrl}
                src={previewUrl}
                alt="Mockup e-KTP bertanda contoh dan tidak berlaku"
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
            <p>{notice || 'Watermark keamanan selalu ditambahkan.'}</p>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link href="/">← KEMBALI KE SOCIAL DOWNLOADER</Link>
        <span>MOCKUP / TIDAK BERLAKU</span>
      </footer>
    </div>
  );
}
