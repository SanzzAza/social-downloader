import { useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/ChatMockup.module.css';

const CARRIERS = ['Indosat', 'XL', 'Three', 'Smartfren'];

const INITIAL_MESSAGES = [
  { id: 'm1', text: 'Hai', side: 'incoming', time: '12' },
  { id: 'm2', text: 'Hai juga, ada apa nih?', side: 'outgoing', time: '12' },
  { id: 'm3', text: 'Boleh minta bantuannya sebentar?', side: 'incoming', time: '12' },
  { id: 'm4', text: 'Boleh, kirim aja detailnya ya.', side: 'outgoing', time: '12' }
];

const MENU_ITEMS = [
  { label: 'Beri Bintang', icon: '☆' },
  { label: 'Balas', icon: '↩' },
  { label: 'Teruskan', icon: '↪' },
  { label: 'Salin', icon: '▣' },
  { label: 'Ucapkan', icon: '▢' },
  { label: 'Laporkan', icon: '⚠' },
  { label: 'Hapus', icon: '⌫', danger: true }
];

function createId() {
  return `m-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ChatMockup() {
  const [provider, setProvider] = useState('Indosat');
  const [hour, setHour] = useState('12');
  const [battery, setBattery] = useState('65');
  const network = '4.5G';
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');
  const [draftSide, setDraftSide] = useState('incoming');
  const [selectedId, setSelectedId] = useState('m1');
  const [menuOpen, setMenuOpen] = useState(true);
  const [reaction, setReaction] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [notice, setNotice] = useState('');
  const captureRef = useRef(null);

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedId) || messages[0],
    [messages, selectedId]
  );

  const batteryValue = Math.max(1, Math.min(100, Number(battery) || 1));

  function updateMessage(id, field, value) {
    setMessages((current) => current.map((message) => (
      message.id === id ? { ...message, [field]: value } : message
    )));
  }

  function removeMessage(id) {
    setMessages((current) => {
      const next = current.filter((message) => message.id !== id);
      if (id === selectedId) {
        setSelectedId(next[0]?.id || '');
        setMenuOpen(false);
      }
      return next;
    });
  }

  function addMessage(event) {
    event.preventDefault();
    if (!draft.trim()) return;

    const next = {
      id: createId(),
      text: draft.trim(),
      side: draftSide,
      time: hour || '12'
    };
    setMessages((current) => [...current, next]);
    setSelectedId(next.id);
    setMenuOpen(false);
    setDraft('');
  }

  function chooseMessage(id) {
    if (id === selectedId) {
      setMenuOpen((current) => !current);
    } else {
      setSelectedId(id);
      setMenuOpen(true);
    }
  }

  function handleGenerate() {
    setIsGenerating(true);
    setMenuOpen(true);
    setNotice('Preview berhasil diperbarui.');
    window.setTimeout(() => setIsGenerating(false), 650);
  }

  async function downloadPng() {
    if (!captureRef.current || isExporting) return;
    setIsExporting(true);
    setNotice('');

    try {
      const module = await import('html2canvas');
      const html2canvas = module.default;
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: '#07130f',
        scale: 2,
        useCORS: true,
        logging: false
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `chat-mockup-${Date.now()}.png`;
      link.click();
      setNotice('PNG berhasil diunduh.');
    } catch (error) {
      console.error(error);
      setNotice('Gagal export PNG. Coba ulangi ya.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className={styles.page}>
      <Head>
        <title>Chat Generator Mockup | Social Downloader</title>
        <meta name="description" content="Buat chat mockup untuk demo dan konten kreatif." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:ital,wght@0,400;0,500;0,600;0,700;0,800;1,600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className={styles.device}>
        <div className={styles.systemStatus} aria-label="Status perangkat">
          <span className={styles.deviceClock}>22.42</span>
          <div className={styles.systemIcons}>
            <span className={styles.alarmIcon} aria-hidden="true">◷</span>
            <span className={styles.systemData}>9,45<br />K/S</span>
            <span className={styles.volte}>Vo<br />LTE</span>
            <span className={styles.systemSignal} aria-hidden="true">▂▄▆</span>
            <span className={styles.systemData}>4.5G<br />K/S</span>
            <span className={styles.systemSignal} aria-hidden="true">▂▄▆</span>
            <span className={styles.systemBattery}><i></i></span>
          </div>
        </div>

        <main className={styles.appSurface}>
          <header className={styles.toolHeader}>
            <Link href="/" className={styles.backPill}>
              <span aria-hidden="true">‹</span>
              <b>All Tools Nexus</b>
            </Link>
            <div className={styles.toolName}>
              <span className={styles.imageGlyph} aria-hidden="true">▣</span>
              <span>CHAT GENERATOR</span>
            </div>
            <button
              type="button"
              className={styles.liveIndicator}
              onClick={() => setEditorOpen((current) => !current)}
              aria-label="Buka editor chat"
              title="Buka editor chat"
            ></button>
          </header>

          <section className={styles.controls} aria-label="Pengaturan generator">
            <div className={styles.carrierGrid}>
              {CARRIERS.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setProvider(item)}
                  className={`${styles.carrierButton} ${provider === item ? styles.carrierSelected : ''}`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className={styles.statusFields}>
              <label>
                <span>Jam:</span>
                <input
                  value={hour}
                  inputMode="numeric"
                  maxLength="2"
                  onChange={(event) => setHour(event.target.value.replace(/\D/g, '').slice(0, 2))}
                  aria-label="Jam chat"
                />
              </label>
              <label>
                <span>Baterai (%):</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={battery}
                  onChange={(event) => setBattery(event.target.value)}
                  aria-label="Baterai perangkat"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              className={`${styles.generateButton} ${isGenerating ? styles.generating : ''}`}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </section>

          <section className={styles.previewShell}>
            <div className={styles.previewRim}>
              <div className={styles.chatCapture} ref={captureRef}>
                <div className={styles.captureStatus}>
                  <div><span className={styles.captureSignal}>▂▄▆</span> {provider}</div>
                  <b>{hour || '12'}</b>
                  <div className={styles.captureRight}>
                    <span>{network}</span>
                    <span>{batteryValue}%</span>
                    <span className={styles.captureBattery}><i style={{ width: `${Math.max(13, batteryValue - 4)}%` }}></i></span>
                  </div>
                </div>

                <div className={styles.captureTop} aria-label="Header chat tersamarkan">
                  <span className={styles.captureBack} aria-hidden="true">‹</span>
                  <div className={styles.blurredIdentity} aria-hidden="true">
                    <span className={styles.blurAvatar}></span>
                    <span className={styles.blurNameBlock}>
                      <i></i>
                      <i></i>
                    </span>
                  </div>
                  <span className={styles.captureSearch} aria-hidden="true">⌕</span>
                  <span className={styles.captureDots} aria-hidden="true">⋮</span>
                </div>

                <div className={styles.captureBody}>
                  <div className={styles.blurredChat}>
                    <span className={styles.captureDate}>HARI INI</span>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`${styles.captureRow} ${message.side === 'outgoing' ? styles.captureOutgoingRow : ''}`}
                      >
                        <button
                          type="button"
                          onClick={() => chooseMessage(message.id)}
                          className={`${styles.captureBubble} ${message.side === 'outgoing' ? styles.captureOutgoing : ''}`}
                        >
                          <span>{message.text || ' '}</span>
                          <small>{message.time || hour || '12'}{message.side === 'outgoing' ? ' ✓✓' : ''}</small>
                        </button>
                      </div>
                    ))}
                  </div>

                  {menuOpen && selectedMessage && (
                    <>
                      <button
                        type="button"
                        className={styles.menuShade}
                        onClick={() => setMenuOpen(false)}
                        aria-label="Tutup menu pesan"
                      />
                      <div className={styles.messageActions}>
                        <div className={styles.reactionBar}>
                          {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((item) => (
                            <button
                              type="button"
                              key={item}
                              onClick={() => {
                                setReaction(item);
                                setMenuOpen(false);
                              }}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                        <div className={styles.actionMenu}>
                          {MENU_ITEMS.map((item) => (
                            <button
                              type="button"
                              key={item.label}
                              className={item.danger ? styles.dangerAction : ''}
                              onClick={() => setMenuOpen(false)}
                            >
                              <span>{item.label}</span>
                              <i aria-hidden="true">{item.icon}</i>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {reaction && !menuOpen && selectedMessage && (
                    <span className={styles.reactionResult}>{reaction}</span>
                  )}
                  <span className={styles.mockupMark}>SIMULASI</span>
                </div>

                <div className={styles.captureComposer}>
                  <span aria-hidden="true">＋</span>
                  <div>Pesan</div>
                  <span aria-hidden="true">◉</span>
                  <span aria-hidden="true">⌁</span>
                </div>
              </div>
            </div>
          </section>

          {notice && <p className={styles.notice}>{notice}</p>}

          {editorOpen && (
            <section className={styles.editorDrawer} aria-label="Editor percakapan">
              <div className={styles.drawerTitle}>
                <span>Edit percakapan</span>
                <small>klik bubble di preview untuk membuka menu</small>
              </div>

              <div className={styles.messageEditorList}>
                {messages.map((message, index) => (
                  <article key={message.id} className={styles.messageEditor}>
                    <div className={styles.messageEditorHead}>
                      <span>Pesan {index + 1}</span>
                      <button type="button" onClick={() => removeMessage(message.id)}>×</button>
                    </div>
                    <textarea
                      rows="2"
                      value={message.text}
                      maxLength="160"
                      onChange={(event) => updateMessage(message.id, 'text', event.target.value)}
                    />
                    <div className={styles.messageOptions}>
                      <select value={message.side} onChange={(event) => updateMessage(message.id, 'side', event.target.value)}>
                        <option value="incoming">Pesan masuk</option>
                        <option value="outgoing">Pesan keluar</option>
                      </select>
                      <input
                        value={message.time}
                        inputMode="numeric"
                        maxLength="5"
                        onChange={(event) => updateMessage(message.id, 'time', event.target.value.slice(0, 5))}
                        aria-label={`Waktu pesan ${index + 1}`}
                      />
                    </div>
                  </article>
                ))}
              </div>

              <form className={styles.newMessage} onSubmit={addMessage}>
                <textarea
                  rows="2"
                  value={draft}
                  maxLength="160"
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Tulis pesan baru..."
                />
                <div>
                  <select value={draftSide} onChange={(event) => setDraftSide(event.target.value)}>
                    <option value="incoming">Pesan masuk</option>
                    <option value="outgoing">Pesan keluar</option>
                  </select>
                  <button type="submit">+ Tambah pesan</button>
                </div>
              </form>

              <div className={styles.utilityRow}>
                <button type="button" onClick={() => setEditorOpen(false)}>Tutup editor</button>
                <button type="button" onClick={downloadPng} disabled={isExporting}>
                  {isExporting ? 'Menyiapkan...' : 'Download PNG'}
                </button>
              </div>
            </section>
          )}
        </main>

        <div className={styles.androidNavigation} aria-hidden="true">
          <span className={styles.navLines}></span>
          <span className={styles.navCircle}></span>
          <span className={styles.navTriangle}></span>
        </div>
      </div>
    </div>
  );
}
