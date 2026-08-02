import { useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/ChatMockup.module.css';

const CARRIERS = ['Axis', 'Indosat', 'XL', 'Three', 'Smartfren'];

// Referensi yang dipakai hanya memperlihatkan satu bubble fokus.
// Pesan tambahan tetap dapat diedit, tetapi disembunyikan saat mode blur aktif.
const STARTER_MESSAGES = [
  { id: 'm1', text: 'Hai', side: 'incoming', time: '12' }
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

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function newId() {
  return `message-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clampBattery(value) {
  return Math.max(1, Math.min(100, Number(value) || 1));
}

export default function ChatMockup() {
  const [carrier, setCarrier] = useState('Axis');
  const [hour, setHour] = useState('12');
  const [battery, setBattery] = useState('65');
  const [messages, setMessages] = useState(STARTER_MESSAGES);
  const [selectedId, setSelectedId] = useState('m1');
  const [menuOpen, setMenuOpen] = useState(true);
  const [blurBackground, setBlurBackground] = useState(true);
  const [reaction, setReaction] = useState('');
  const [draft, setDraft] = useState('');
  const [draftSide, setDraftSide] = useState('incoming');
  const [isExporting, setIsExporting] = useState(false);
  const [notice, setNotice] = useState('');
  const captureRef = useRef(null);
  const holdTimer = useRef(null);

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedId) || messages[0],
    [messages, selectedId]
  );
  const backgroundMessages = useMemo(
    () => messages.filter((message) => message.id !== selectedMessage?.id),
    [messages, selectedMessage]
  );
  const batteryValue = clampBattery(battery);

  function updateMessage(id, key, value) {
    setMessages((current) => current.map((message) => (
      message.id === id ? { ...message, [key]: value } : message
    )));
  }

  function focusMessage(id) {
    setSelectedId(id);
    setReaction('');
    setMenuOpen(true);
  }

  function deleteMessage(id) {
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
    const text = draft.trim();
    if (!text) return;

    const next = {
      id: newId(),
      text,
      side: draftSide,
      time: hour || '12'
    };
    setMessages((current) => [...current, next]);
    setSelectedId(next.id);
    setMenuOpen(true);
    setReaction('');
    setDraft('');
  }

  function generatePreview() {
    if (!selectedMessage && messages.length) setSelectedId(messages[0].id);
    setReaction('');
    setMenuOpen(true);
    setNotice('Preview diperbarui. Tahan atau klik bubble untuk membuka menu.');
  }

  function beginHold() {
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => setMenuOpen(true), 350);
  }

  function cancelHold() {
    window.clearTimeout(holdTimer.current);
  }

  function pickReaction(item) {
    setReaction(item);
    setMenuOpen(false);
    setNotice('Reaction berhasil dipasang pada pesan fokus.');
  }

  function chooseAction(item) {
    if (item.label === 'Hapus' && selectedMessage) {
      deleteMessage(selectedMessage.id);
      setNotice('Pesan fokus dihapus.');
      return;
    }
    setMenuOpen(false);
    setNotice(`${item.label} dipilih pada preview.`);
  }

  async function downloadPng() {
    if (!captureRef.current || isExporting) return;
    const capture = captureRef.current;
    const previousWidth = capture.style.width;
    const previousMaxWidth = capture.style.maxWidth;
    const previousFlex = capture.style.flex;

    setIsExporting(true);
    setNotice('');

    try {
      const module = await import('html2canvas');
      const html2canvas = module.default;

      // Selalu hasilkan rasio dan resolusi yang sama dengan referensi:
      // 657 × 1137 px. Di layar HP preview bisa mengecil responsif, namun
      // file unduhan tidak lagi ikut membesar/mengecil sesuai lebar browser.
      capture.style.width = '414px';
      capture.style.maxWidth = 'none';
      // preview berada di dalam flex container; cegah browser mengecilkan
      // canvas sebelum html2canvas menghitung ukurannya.
      capture.style.flex = '0 0 414px';

      await new Promise((resolve) => requestAnimationFrame(resolve));
      const canvas = await html2canvas(capture, {
        backgroundColor: '#07101d',
        scale: 657 / 414,
        useCORS: true,
        logging: false
      });

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `ios-chat-mockup-${Date.now()}.png`;
      link.click();
      setNotice('PNG berhasil diunduh.');
    } catch (error) {
      console.error(error);
      setNotice('Export gagal. Coba ulangi sebentar lagi.');
    } finally {
      capture.style.width = previousWidth;
      capture.style.maxWidth = previousMaxWidth;
      capture.style.flex = previousFlex;
      setIsExporting(false);
    }
  }

  return (
    <div className={styles.page}>
      <Head>
        <title>iOS Chat Mockup Generator | Social Downloader</title>
        <meta name="description" content="Editor chat mockup iOS untuk demo dan konten kreatif." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#090d18" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>

      <header className={styles.appHeader}>
        <Link href="/" className={styles.backLink}>← ALL TOOLS</Link>
        <div className={styles.appTitle}>
          <span aria-hidden="true">◫</span>
          <strong>iOS CHAT MOCKUP</strong>
        </div>
        <span className={styles.mockupBadge}>SIMULASI</span>
      </header>

      <main className={styles.workspace}>
        <section className={styles.editor} aria-label="Editor chat mockup">
          <div className={styles.editorHeading}>
            <p>01 / EDITOR</p>
            <h1>Buat scene chat</h1>
            <span>Identitas kontak disamarkan agar hasil tetap berupa mockup.</span>
          </div>

          <section className={styles.editorSection}>
            <div className={styles.sectionTitle}>
              <span>STATUS BAR</span>
              <small>iOS-style</small>
            </div>

            <label className={styles.field}>
              <span>Operator</span>
              <select value={carrier} onChange={(event) => setCarrier(event.target.value)}>
                {CARRIERS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>

            <div className={styles.twoFields}>
              <label className={styles.field}>
                <span>Jam</span>
                <input
                  value={hour}
                  inputMode="numeric"
                  maxLength="5"
                  onChange={(event) => setHour(event.target.value.slice(0, 5))}
                  placeholder="12"
                />
              </label>
              <label className={styles.field}>
                <span>Baterai (%)</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={battery}
                  onChange={(event) => setBattery(event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className={styles.editorSection}>
            <div className={styles.sectionTitle}>
              <span>PESAN</span>
              <small>{messages.length} bubble</small>
            </div>

            <div className={styles.messageList}>
              {messages.map((message, index) => (
                <article
                  className={`${styles.messageCard} ${message.id === selectedMessage?.id ? styles.focusedCard : ''}`}
                  key={message.id}
                >
                  <div className={styles.messageCardHead}>
                    <span>PESAN {index + 1}</span>
                    <div>
                      <button type="button" onClick={() => focusMessage(message.id)}>FOKUS</button>
                      <button type="button" onClick={() => deleteMessage(message.id)} aria-label={`Hapus pesan ${index + 1}`}>×</button>
                    </div>
                  </div>
                  <textarea
                    rows="2"
                    value={message.text}
                    maxLength="180"
                    onChange={(event) => updateMessage(message.id, 'text', event.target.value)}
                  />
                  <div className={styles.messageMetaControls}>
                    <select value={message.side} onChange={(event) => updateMessage(message.id, 'side', event.target.value)}>
                      <option value="incoming">Masuk</option>
                      <option value="outgoing">Keluar</option>
                    </select>
                    <input
                      value={message.time}
                      maxLength="5"
                      inputMode="numeric"
                      onChange={(event) => updateMessage(message.id, 'time', event.target.value.slice(0, 5))}
                      aria-label={`Jam pesan ${index + 1}`}
                    />
                  </div>
                </article>
              ))}
            </div>

            <form className={styles.addMessage} onSubmit={addMessage}>
              <textarea
                rows="2"
                value={draft}
                maxLength="180"
                placeholder="Tulis pesan baru..."
                onChange={(event) => setDraft(event.target.value)}
              />
              <div>
                <select value={draftSide} onChange={(event) => setDraftSide(event.target.value)}>
                  <option value="incoming">Pesan masuk</option>
                  <option value="outgoing">Pesan keluar</option>
                </select>
                <button type="submit">+ TAMBAH</button>
              </div>
            </form>
          </section>

          <section className={styles.editorSection}>
            <div className={styles.sectionTitle}>
              <span>TAMPILAN</span>
              <small>Preview</small>
            </div>
            <label className={styles.switchLine}>
              <span>
                <strong>Blur percakapan belakang</strong>
                <small>Hanya bubble fokus yang tampil jelas seperti contoh.</small>
              </span>
              <input
                type="checkbox"
                checked={blurBackground}
                onChange={(event) => setBlurBackground(event.target.checked)}
              />
              <i aria-hidden="true"></i>
            </label>
            <label className={styles.switchLine}>
              <span>
                <strong>Menu tahan pesan</strong>
                <small>Reaction dan pilihan aksi di preview.</small>
              </span>
              <input
                type="checkbox"
                checked={menuOpen}
                onChange={(event) => setMenuOpen(event.target.checked)}
              />
              <i aria-hidden="true"></i>
            </label>
          </section>

          <button type="button" className={styles.generateButton} onClick={generatePreview}>
            GENERATE PREVIEW
          </button>
          <button type="button" className={styles.exportButton} onClick={downloadPng} disabled={isExporting}>
            {isExporting ? 'MENYIAPKAN PNG...' : 'DOWNLOAD PNG'} ↓
          </button>
          {notice && <p className={styles.notice}>{notice}</p>}
        </section>

        <section className={styles.previewColumn} aria-label="Preview chat iOS">
          <div className={styles.previewHeading}>
            <div>
              <p>02 / LIVE PREVIEW</p>
              <h2>Long-press scene</h2>
            </div>
            <span>9:16</span>
          </div>

          <div className={styles.previewStage}>
            <div className={styles.iosScreen} ref={captureRef}>
              <div className={styles.statusBar}>
                <div className={styles.statusCarrier}>
                  <span className={styles.signal} aria-hidden="true">▂▄▆</span>
                  <span>{carrier}</span>
                </div>
                <strong>{hour || '12'}</strong>
                <div className={styles.statusBattery}>
                  <span>{batteryValue}%</span>
                  <span className={styles.batteryShape}><i style={{ width: `${Math.max(12, batteryValue - 4)}%` }}></i></span>
                </div>
              </div>

              <div className={styles.identityHeader} aria-label="Identitas kontak diburamkan">
                <div className={styles.identityBlur} aria-hidden="true">
                  <span className={styles.identityAvatar}></span>
                  <span className={styles.identityText}><i></i><i></i></span>
                </div>
              </div>

              <div className={styles.chatArea}>
                <div className={`${styles.backgroundConversation} ${blurBackground ? styles.backgroundBlurred : ''}`}>
                  {!blurBackground && (
                    <>
                      <span className={styles.dayChip}>HARI INI</span>
                      {backgroundMessages.map((message, index) => (
                        <div
                          key={message.id}
                          className={`${styles.backgroundRow} ${message.side === 'outgoing' ? styles.backgroundOutgoing : ''} ${index === 0 ? styles.backgroundTop : ''}`}
                        >
                          <span className={`${styles.backgroundBubble} ${message.side === 'outgoing' ? styles.backgroundOutgoingBubble : ''}`}>
                            {message.text || ' '}
                            <small>{message.time || hour || '12'}</small>
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {selectedMessage && (
                  <button
                    type="button"
                    className={`${styles.focusBubble} ${selectedMessage.side === 'outgoing' ? styles.focusOutgoing : ''}`}
                    onClick={() => setMenuOpen((current) => !current)}
                    onPointerDown={beginHold}
                    onPointerUp={cancelHold}
                    onPointerLeave={cancelHold}
                    onPointerCancel={cancelHold}
                    aria-label="Tahan pesan untuk membuka menu"
                  >
                    <span>{selectedMessage.text || ' '}</span>
                    <small>{selectedMessage.time || hour || '12'}</small>
                    {reaction && <b>{reaction}</b>}
                  </button>
                )}

                {menuOpen && selectedMessage && (
                  <>
                    <button
                      type="button"
                      className={styles.dimLayer}
                      onClick={() => setMenuOpen(false)}
                      aria-label="Tutup menu"
                    />
                    <div className={styles.reactionPicker}>
                      {REACTIONS.map((item) => (
                        <button type="button" onClick={() => pickReaction(item)} key={item}>{item}</button>
                      ))}
                    </div>
                    <div className={styles.contextMenu}>
                      {MENU_ITEMS.map((item) => (
                        <button
                          type="button"
                          className={item.danger ? styles.dangerItem : ''}
                          key={item.label}
                          onClick={() => chooseAction(item)}
                        >
                          <span>{item.label}</span>
                          <i aria-hidden="true">{item.icon}</i>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <span className={styles.captureWatermark}>SIMULASI</span>
            </div>
          </div>
          <p className={styles.previewHint}>Klik atau tahan bubble fokus untuk membuka menu. Output selalu diberi tanda simulasi.</p>
        </section>
      </main>
    </div>
  );
}
