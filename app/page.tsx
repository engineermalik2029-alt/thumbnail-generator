'use client';

import { useState, useEffect, useRef } from 'react';

interface GenerateResponse {
  imageUrl?: string;
  topic: string;
  prompt: string;
  preset?: string;
  error?: string;
}

const DAILY_LIMIT = 500;
const USAGE_KEY = 'tf_usage';
const ALLTIME_KEY = 'tf_alltime';
const DATE_KEY = 'tf_date';

const SUBJECTS = [
  'a shocked young man in hoodie pointing at camera',
  'a woman with wide eyes and open mouth in surprise',
  'a confident person smiling with arms crossed',
  'a gamer wearing headphones looking intensely at screen',
  'a person holding glowing object looking amazed',
];

const PRESETS = [
  { id: 'harry', label: 'Harry Style', desc: 'Yellow text + dark bg + arrows', colors: ['#FFD700', '#0a0a2e', '#FFFFFF'] },
  { id: 'tech', label: 'Tech Thriller', desc: 'Blue/orange contrast + glowing', colors: ['#0066ff', '#ff6b00', '#0a1628'] },
  { id: 'gaming', label: 'Gaming Explosive', desc: 'Red/yellow + fire/lightning', colors: ['#ff0033', '#ffd700', '#1a1a1a'] },
];

function getUsageStats(): { today: number; allTime: number; date: string } {
  if (typeof window === 'undefined') return { today: 0, allTime: 0, date: '' };
  const today = new Date().toISOString().split('T')[0];
  const storedDate = localStorage.getItem(DATE_KEY);
  const storedUsage = parseInt(localStorage.getItem(USAGE_KEY) || '0', 10);
  const storedAllTime = parseInt(localStorage.getItem(ALLTIME_KEY) || '0', 10);
  if (storedDate !== today) {
    localStorage.setItem(DATE_KEY, today);
    localStorage.setItem(USAGE_KEY, '0');
    return { today: 0, allTime: storedAllTime, date: today };
  }
  return { today: storedUsage, allTime: storedAllTime, date: storedDate || today };
}

function incrementUsage(): void {
  const stats = getUsageStats();
  const today = stats.date || new Date().toISOString().split('T')[0];
  localStorage.setItem(DATE_KEY, today);
  localStorage.setItem(USAGE_KEY, String(stats.today + 1));
  localStorage.setItem(ALLTIME_KEY, String(stats.allTime + 1));
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.7);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function applyColorGrading(ctx: CanvasRenderingContext2D, w: number, h: number, preset: string) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const contrast = 1.35;
  const saturation = 1.5;

  // Preset-specific color tint
  const tint = preset === 'harry' ? [0.02, 0.01, -0.03] :
               preset === 'tech' ? [-0.02, 0.0, 0.04] :
               preset === 'gaming' ? [0.03, -0.01, -0.03] : [0, 0, 0];

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];

    // Contrast boost
    r = Math.min(255, Math.max(0, (r - 128) * contrast + 128));
    g = Math.min(255, Math.max(0, (g - 128) * contrast + 128));
    b = Math.min(255, Math.max(0, (b - 128) * contrast + 128));

    // Saturation boost
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = Math.min(255, Math.max(0, gray + (r - gray) * saturation));
    g = Math.min(255, Math.max(0, gray + (g - gray) * saturation));
    b = Math.min(255, Math.max(0, gray + (b - gray) * saturation));

    // Preset color tint
    r = Math.min(255, Math.max(0, r + tint[0] * 255));
    g = Math.min(255, Math.max(0, g + tint[1] * 255));
    b = Math.min(255, Math.max(0, b + tint[2] * 255));

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);
}

function drawTextBar(ctx: CanvasRenderingContext2D, w: number, h: number, pos: string) {
  const barHeight = h * 0.22;
  let y: number;
  if (pos === 'top') y = 0;
  else if (pos === 'center') y = h / 2 - barHeight / 2;
  else y = h - barHeight;

  // Multi-layer dark gradient for depth
  const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
  grad.addColorStop(0, 'rgba(0,0,0,0.92)');
  grad.addColorStop(0.15, 'rgba(0,0,0,0.82)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.72)');
  grad.addColorStop(0.85, 'rgba(0,0,0,0.82)');
  grad.addColorStop(1, 'rgba(0,0,0,0.92)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, w, barHeight);

  // Gold accent lines top and bottom
  const lineGrad = ctx.createLinearGradient(0, y, w, y);
  lineGrad.addColorStop(0, 'rgba(255,215,0,0)');
  lineGrad.addColorStop(0.3, 'rgba(255,215,0,0.6)');
  lineGrad.addColorStop(0.7, 'rgba(255,215,0,0.6)');
  lineGrad.addColorStop(1, 'rgba(255,215,0,0)');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(0, y, w, 4);
  ctx.fillRect(0, y + barHeight - 4, w, 4);
}

function drawBoldText(ctx: CanvasRenderingContext2D, text: string, w: number, h: number, pos: string) {
  if (!text) return;
  let fs = Math.min(130, Math.floor(w / (text.length * 0.55)));
  fs = Math.max(40, fs);
  ctx.font = '900 ' + fs + 'px "Impact", "Arial Black", sans-serif';
  const maxW = w * 0.85;
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    if (ctx.measureText(testLine).width > maxW && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  if (lines.length === 1 && ctx.measureText(lines[0]).width > maxW) {
    const mid = Math.ceil(words.length / 2);
    lines.splice(0, 1, words.slice(0, mid).join(' '), words.slice(mid).join(' '));
  }
  if (lines.length > 1) {
    const maxLen = Math.max(...lines.map(l => l.length));
    fs = Math.min(90, Math.floor(w / (maxLen * 0.5)));
    fs = Math.max(30, fs);
    ctx.font = '900 ' + fs + 'px "Impact", "Arial Black", sans-serif';
  }
  const lh = fs * 1.15;
  const th = lines.length * lh;
  const barHeight = h * 0.2;
  let startY: number;
  if (pos === 'top') startY = (barHeight - th) / 2 + lh * 0.85;
  else if (pos === 'center') startY = (h - th) / 2 + lh * 0.8;
  else startY = (h - barHeight) + (barHeight - th) / 2 + lh * 0.85;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lh;
    const line = lines[i];
    ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 6;
    ctx.shadowOffsetY = 6;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(8, fs * 0.15);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeText(line, w / 2, y);
    ctx.lineWidth = Math.max(6, fs * 0.1);
    ctx.strokeText(line, w / 2, y);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    // Main fill — gold gradient for Harry preset
    const textGrad = ctx.createLinearGradient(w / 2 - 200, y - fs, w / 2 + 200, y + fs);
    textGrad.addColorStop(0, '#FFD700');
    textGrad.addColorStop(0.5, '#FFFFFF');
    textGrad.addColorStop(1, '#FFD700');
    ctx.fillStyle = textGrad;
    ctx.fillText(line, w / 2, y);

    // Subtle highlight on top
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillText(line, w / 2, y - 2);
  }
}

function drawArrow(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w * 0.25;
  const cy = h * 0.45;
  const size = Math.min(w, h) * 0.08;
  ctx.save();
  ctx.shadowColor = 'rgba(255,215,0,0.6)';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(cx + size * 0.3, cy + size * 0.2, size * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,215,0,0.25)';
  ctx.fill();
  ctx.shadowBlur = 15;
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255,215,0,0.5)';
  ctx.beginPath();
  ctx.moveTo(cx - size * 1.5, cy + size * 0.3);
  ctx.lineTo(cx + size * 0.5, cy + size * 0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = '#FFD700';
  ctx.shadowBlur = 15;
  ctx.moveTo(cx + size * 1.2, cy + size * 0.2);
  ctx.lineTo(cx + size * 0.3, cy - size * 0.3);
  ctx.lineTo(cx + size * 0.3, cy + size * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(255,215,0,0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.75, h * 0.3);
  ctx.quadraticCurveTo(w * 0.8, h * 0.45, w * 0.75, h * 0.55);
  ctx.stroke();
  ctx.restore();
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function Home() {
  const [topic, setTopic] = useState('');
  const [subjectDesc, setSubjectDesc] = useState('');
  const [overlayText, setOverlayText] = useState('');
  const [preset, setPreset] = useState('harry');
  const [intensity, setIntensity] = useState(85);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [promptText, setPromptText] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [textPos, setTextPos] = useState('bottom');
  const [showArrow, setShowArrow] = useState(false);
  const [usageToday, setUsageToday] = useState(0);
  const [usageAllTime, setUsageAllTime] = useState(0);
  const [showDevTools, setShowDevTools] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const stats = getUsageStats();
    setUsageToday(stats.today);
    setUsageAllTime(stats.allTime);
  }, []);

  function refreshUsage() {
    const stats = getUsageStats();
    setUsageToday(stats.today);
    setUsageAllTime(stats.allTime);
  }

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function renderCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 1920, 1080);
    if (bgImageRef.current) {
      ctx.drawImage(bgImageRef.current, 0, 0, 1920, 1080);
      applyColorGrading(ctx, 1920, 1080, preset);
      drawVignette(ctx, 1920, 1080);
    }
    const displayText = (overlayText || topic).toUpperCase();
    drawTextBar(ctx, 1920, 1080, textPos);
    drawBoldText(ctx, displayText, 1920, 1080, textPos);
    if (showArrow) drawArrow(ctx, 1920, 1080);
  }

  async function handleGenerate() {
    if (!topic.trim()) return;
    setLoading(true);
    setImageUrl('');
    setPromptText('');
    setError('');
    bgImageRef.current = null;
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          subjectDescription: subjectDesc.trim(),
          overlayText: overlayText.trim(),
          preset,
          intensity,
        }),
      });
      const data = (await res.json()) as GenerateResponse;
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      // Pollinations returns a URL directly - fetch it as blob for canvas
      if (data.imageUrl) {
        const img = await loadImage(data.imageUrl);
        bgImageRef.current = img;
        setImageUrl(data.imageUrl);
        setPromptText(data.prompt || '');
        renderCanvas();
        incrementUsage();
        refreshUsage();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!canvasRef.current) return;
    showToastMsg('Downloading...');
    const a = document.createElement('a');
    a.href = canvasRef.current.toDataURL('image/png');
    a.download = (overlayText || topic).replace(/\s+/g, '_').toUpperCase() + '_THUMBNAIL.png';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 100);
    showToastMsg('Downloaded!');
  }

  function handleResetCounter() {
    const allTime = parseInt(localStorage.getItem(ALLTIME_KEY) || '0', 10);
    localStorage.setItem(USAGE_KEY, '0');
    refreshUsage();
    showToastMsg('Counter reset for testing');
  }

  const remaining = DAILY_LIMIT - usageToday;
  const usagePercent = Math.round((usageToday / DAILY_LIMIT) * 100);

  return (
    <div className="main-container">
      <nav className="nav">
        <a href="/" className="nav-logo">
          <div className="nav-logo-icon">🎬</div>
          <span className="nav-logo-text">Thumbnail<span>Forge</span></span>
        </a>
        <div className="nav-actions">
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pollinations AI • Free</span>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-badge"><span className="dot" /> YouTube Thumbnail Generator</div>
        <h1 className="hero-title">
          <span className="gradient-text">Pro YouTube Thumbnails with AI</span>
        </h1>
        <p className="hero-subtitle">
          AI generates subject + background — then we add bold text, arrows, and effects.
          Completely free, no API key needed.
        </p>
      </section>

      <section id="generator" className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">Settings</span></div>

          <div className="form-group">
            <label className="form-label">Video Topic</label>
            <div className="input-wrapper">
              <span className="input-icon">🎬</span>
              <input type="text" placeholder="e.g. Python Tutorial"
                value={topic} onChange={(e) => setTopic(e.target.value)} className="input-field" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Subject Description</label>
            <div className="input-wrapper">
              <span className="input-icon">🧑</span>
              <input type="text" placeholder="e.g. shocked young man in hoodie"
                value={subjectDesc} onChange={(e) => setSubjectDesc(e.target.value)} className="input-field" />
            </div>
            <div className="chips" style={{ marginTop: '0.3rem', flexWrap: 'wrap' }}>
              {SUBJECTS.map((s, i) => (
                <button key={i} className={'chip ' + (subjectDesc === s ? 'active' : '')}
                  onClick={() => setSubjectDesc(s)} style={{ fontSize: '0.7rem' }}>{s.slice(0, 22)}..</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Text Overlay</label>
            <div className="input-wrapper">
              <span className="input-icon">📝</span>
              <input type="text" placeholder="e.g. DON'T DO THIS (blank = topic)"
                value={overlayText} onChange={(e) => setOverlayText(e.target.value)} className="input-field" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Style Preset</label>
            <div className="chips" style={{ flexDirection: 'column', gap: '0.3rem' }}>
              {PRESETS.map((p) => (
                <button key={p.id} className={'chip ' + (preset === p.id ? 'active' : '')}
                  style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem' }}
                  onClick={() => setPreset(p.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {p.colors.map((c, i) => (<div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c }} />))}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.label}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{p.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Text Position</label>
            <div className="chips">
              {['bottom', 'top', 'center'].map((p) => (
                <button key={p} className={'chip ' + (textPos === p ? 'active' : '')} onClick={() => setTextPos(p)}>
                  {p === 'bottom' ? 'Bottom' : p === 'top' ? 'Top' : 'Center'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Arrow</label>
            <div className="chips">
              <button className={'chip ' + (showArrow ? 'active' : '')} onClick={() => setShowArrow(!showArrow)}>
                {showArrow ? 'Arrow ON' : 'Arrow OFF'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Intensity: {intensity}%</label>
            <input type="range" min="0" max="100" value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#ff0033' }} />
          </div>

          <button onClick={handleGenerate} disabled={loading || !topic.trim()} className="btn btn-primary">
            {loading ? 'Generating...' : 'Generate Thumbnail'}
          </button>

          {loading && (
            <div className="loading-container">
              <div className="loading-text">AI creating thumbnail...</div>
              <div className="loading-bar-container"><div className="loading-bar" /></div>
            </div>
          )}

          {error && (
            <div className="error-display">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Preview</span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {imageUrl && <span style={{ fontSize: '0.65rem', color: '#00e5ff' }}>AI</span>}
              <span style={{ fontSize: '0.65rem', color: '#FFD700' }}>{PRESETS.find(p => p.id === preset)?.label}</span>
            </div>
          </div>

          {!imageUrl && !loading && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '4rem', opacity: 0.3 }}>🎬</span>
              <h3 style={{ color: 'var(--text-secondary)' }}>Your thumbnail appears here</h3>
              <p style={{ fontSize: '0.85rem' }}>Enter topic and generate</p>
            </div>
          )}

          {imageUrl && (
            <div className="image-card" style={{ marginBottom: '0.75rem', cursor: 'default' }}>
              <canvas ref={canvasRef} width={1920} height={1080}
                style={{ width: '100%', aspectRatio: '16/9', borderRadius: 'var(--radius-md)' }}
                onMouseUp={renderCanvas} />
              <div className="image-card-overlay" style={{ opacity: 1, justifyContent: 'center', gap: '0.75rem' }}>
                <button onClick={handleDownload} className="image-card-btn" style={{ width: 40, height: 40 }}>⬇</button>
              </div>
            </div>
          )}

          {/* Usage Statistics Card */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
            marginTop: '0.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.1rem' }}>📊</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Statistics
              </span>
              <div style={{
                marginLeft: 'auto',
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                padding: '0.15rem 0.5rem',
                borderRadius: '100px',
                background: 'rgba(255,255,255,0.05)',
              }}>
                Daily usage
              </div>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Today</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: remaining > 0 ? '#00e676' : '#ff1744' }}>
                  {usageToday} / {DAILY_LIMIT}
                </span>
              </div>
              <div style={{
                width: '100%', height: 6,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: usagePercent + '%',
                  height: '100%',
                  borderRadius: 10,
                  background: remaining > 50 ? 'linear-gradient(90deg, #00e676, #00c853)' :
                               remaining > 10 ? 'linear-gradient(90deg, #ffd700, #ff9100)' :
                               'linear-gradient(90deg, #ff9100, #ff1744)',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{
                background: 'rgba(0,230,118,0.08)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem',
              }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Remaining</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#00e676' }}>{Math.max(0, remaining)}</div>
              </div>
              <div style={{
                background: 'rgba(108,99,255,0.08)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem',
              }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>All Time</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#6c63ff' }}>{usageAllTime}</div>
              </div>
            </div>

            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
              Resets daily at midnight
            </div>

            <div style={{ display: showDevTools ? 'block' : 'none', marginTop: '0.5rem', textAlign: 'center' }}>
              <button onClick={handleResetCounter} style={{
                background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.2)',
                color: '#ff6666', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-sm)',
                fontSize: '0.65rem', cursor: 'pointer',
              }}>
                Reset Daily Counter
              </button>
            </div>
          </div>

          {promptText && (
            <details style={{ marginTop: '0.5rem' }}>
              <summary style={{ fontSize: '0.7rem', color: 'var(--text-muted)', cursor: 'pointer' }}>View AI Prompt</summary>
              <pre style={{ fontSize: '0.65rem', maxHeight: '100px', overflowY: 'auto', marginTop: '0.3rem', color: 'var(--text-secondary)' }}>{promptText}</pre>
            </details>
          )}
        </div>
      </section>

      <footer className="footer">
        <p>Powered by <a href="https://pollinations.ai" target="_blank">Pollinations AI</a> (free)</p>
      </footer>

      <div className={'toast ' + (toast ? 'visible' : '')}>{toast}</div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, padding: '10px', cursor: 'pointer', zIndex: 999, opacity: 0.05, fontSize: '10px' }}
        onClick={() => setShowDevTools(!showDevTools)} title="Toggle Dev Tools">
        dev
      </div>
    </div>
  );
}