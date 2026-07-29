import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

export default function TempMail() {
  const [email, setEmail] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeMessage, setActiveMessage] = useState(null);
  const [copying, setCopying] = useState(false);

  const generateEmail = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tempmail?action=genRandomMailbox');
      const data = await res.json();
      if (data && data.length > 0) {
        setEmail(data[0]);
        setMessages([]);
        setActiveMessage(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkMessages = async () => {
    if (!email) return;
    setLoading(true);
    const [login] = email.split('@');
    try {
      const res = await fetch(`/api/tempmail?action=getMessages&login=${login}`);
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const readMessage = async (id) => {
    const [login] = email.split('@');
    setLoading(true);
    try {
      const res = await fetch(`/api/tempmail?action=readMessage&login=${login}&id=${id}`);
      const data = await res.json();
      const meta = messages.find(m => m.id === id);
      setActiveMessage({ ...data, ...meta });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(email);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  useEffect(() => {
    generateEmail();
  }, []);

  useEffect(() => {
    let interval;
    if (email) {
      interval = setInterval(checkMessages, 10000); // Auto check every 10 seconds
    }
    return () => clearInterval(interval);
  }, [email]);

  return (
    <div className={styles.container}>
      <Head>
        <title>Temp Mail - Kotak Masuk Email Sementara</title>
        <meta name="description" content="Gunakan email sementara gratis untuk menghindari spam. Cepat, aman, dan tanpa registrasi." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#1A1A2E" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>✉</span>
          <h1>TEMP MAIL</h1>
        </div>
        <p className={styles.tagline}>Email sementara gratis untuk menjaga privasi kamu</p>

        <nav className={styles.navBar}>
          <Link href="/" className={styles.navLink}>
            ← DOWNLOADER
          </Link>
          <span className={styles.navActive}>TEMP MAIL</span>
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
            <div className={styles.formGroup}>
              <label>Alamat Email Kamu</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={email}
                  readOnly
                  placeholder="Sedang membuat email..."
                />
                <button
                  onClick={copyToClipboard}
                  className={styles.submitBtn}
                  style={{ width: 'auto', padding: '0 20px', minWidth: '120px' }}
                >
                  <span>{copying ? 'SALIN!' : 'SALIN'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={generateEmail}
              className={styles.submitBtn}
              disabled={loading}
              style={{ background: 'var(--accent)', marginBottom: '10px' }}
            >
              <span>BUAT EMAIL BARU</span>
            </button>
            <button
              onClick={checkMessages}
              className={styles.submitBtn}
              disabled={loading}
            >
              <span>{loading ? 'MEMERIKSA...' : 'CEK PESAN MASUK'}</span>
            </button>
          </div>

          <div className={styles.sectionTitle}>
            <span className={styles.titleNumber}>📩</span>
            KOTAK MASUK
          </div>

          <div className={styles.resultPanel} style={{ display: 'block', borderLeftColor: 'var(--primary)' }}>
            {messages.length === 0 ? (
              <div className={styles.resultMeta}>
                <div className={styles.resultTitle}>Belum ada pesan masuk</div>
                <div className={styles.resultSub}>Pesan akan muncul di sini secara otomatis.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => readMessage(msg.id)}
                    style={{
                      padding: '15px',
                      border: '2px solid var(--secondary)',
                      cursor: 'pointer',
                      background: activeMessage?.id === msg.id ? '#f0f0f0' : 'white',
                      boxShadow: '3px 3px 0 var(--secondary)'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{msg.from}</div>
                    <div style={{ fontSize: '13px', margin: '5px 0' }}>{msg.subject}</div>
                    <div style={{ fontSize: '11px', opacity: 0.6 }}>{msg.date}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activeMessage && (
            <div className={styles.resultPanel} style={{ display: 'block', marginTop: '20px' }}>
              <div className={styles.resultHead}>
                <div className={styles.resultMeta}>
                  <div className={styles.resultTitle}>{activeMessage.subject}</div>
                  <div className={styles.resultSub}>Dari: {activeMessage.from} | Tanggal: {activeMessage.date}</div>
                </div>
              </div>
              <div
                style={{
                  marginTop: '15px',
                  padding: '15px',
                  borderTop: '2px solid var(--secondary)',
                  overflowX: 'auto',
                  background: 'white',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}
                dangerouslySetInnerHTML={{ __html: activeMessage.htmlBody || activeMessage.body }}
              />
            </div>
          )}
        </section>

        <section className={styles.howSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.titleNumber}>?</span>
            APA ITU TEMP MAIL?
          </h2>
          <div className={styles.stepGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>1</div>
              <p>Email sementara adalah layanan yang memberikan alamat email yang akan habis masa berlakunya setelah waktu tertentu.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>2</div>
              <p>Gunakan untuk mendaftar di situs web yang tidak terpercaya guna menghindari spam di email utama kamu.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>3</div>
              <p>Kamu bisa membaca email verifikasi atau kode OTP langsung di halaman ini secara real-time.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>SOCIAL DOWNLOADER + TEMP MAIL</p>
        <p>Gratis · Cepat · Privasi Terjaga</p>
      </footer>
    </div>
  );
}
