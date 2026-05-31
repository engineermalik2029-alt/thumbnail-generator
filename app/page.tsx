'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface GenerateResponse {
  imageUrl?: string;
  topic: string;
  prompt: string;
  preset?: string;
  error?: string;
}

interface GalleryItem {
  id: string;
  imageUrl: string;
  topic: string;
  preset: string;
  timestamp: number;
}

const DAILY_LIMIT = 500;
const USAGE_KEY = 'tf_usage';
const ALLTIME_KEY = 'tf_alltime';
const DATE_KEY = 'tf_date';
const GALLERY_KEY = 'tf_gallery';

const SUBJECTS = [
  'a shocked young man in hoodie pointing at camera',
  'a woman with wide eyes and open mouth in surprise',
  'a confident person smiling with arms crossed',
  'a gamer wearing headphones looking intensely at screen',
  'a person holding glowing object looking amazed',
  'a teacher pointing at a whiteboard excitedly',
  'a person reacting with extreme surprise',
];

const PRESETS = [
  { id: 'harry', label: 'Harry Style', desc: 'Gold text + dark bg + arrows', colors: ['#FFD700', '#0a0a2e', '#FFFFFF'] },
  { id: 'tech', label: 'Tech Thriller', desc: 'Blue/orange + futuristic', colors: ['#0066ff', '#ff6b00', '#0a1628'] },
  { id: 'gaming', label: 'Gaming Explosive', desc: 'Red/yellow + fire', colors: ['#ff0033', '#ffd700', '#1a1a1a'] },
  { id: 'cinematic', label: 'Cinematic', desc: 'Orange/teal + dramatic', colors: ['#ff6b35', '#00b4d8', '#1a1a2e'] },
  { id: 'neon', label: 'Neon Glow', desc: 'Pink/purple neon vibes', colors: ['#ff006e', '#8338ec', '#0a0a1a'] },
  { id: 'minimal', label: 'Minimal Clean', desc: 'White + clean modern', colors: ['#ffffff', '#333333', '#f0f0f0'] },
];

const EXPORT_SIZES = [
  { id: 'yt', label: 'YouTube', w: 1280, h: 720 },
  { id: 'ig', label: 'Instagram', w: 1080, h: 1080 },
  { id: 'twitter', label: 'Twitter/X', w: 1200, h: 675 },
  { id: '4k', label: '4K', w: 2560, h: 1440 },
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

function getGallery(): GalleryItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(GALLERY_KEY) || '[]'); } catch { return []; }
}

function addToGallery(item: GalleryItem) {
  const gallery = getGallery();
  gallery.unshift(item);
  if (gallery.length > 20) gallery.pop();
  localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery));
}

function removeFromGallery(id: string) {
  const gallery = getGallery().filter(g => g.id !== id);
  localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery));
}

// ========== CANVAS DRAWING ==========

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
  const tints: Record<string, number[]> = {
    harry: [0.02, 0.01, -0.03], tech: [-0.02, 0.0, 0.04],
    gaming: [0.03, -0.01, -0.03], cinematic: [0.03, 0.0, -0.02],
    neon: [0.02, -0.02, 0.04], minimal: [0, 0, 0],
  };
  const tint = tints[preset] || [0, 0, 0];
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];
    r = Math.min(255, Math.max(0, (r - 128) * contrast + 128));
    g = Math.min(255, Math.max(0, (g - 128) * contrast + 128));
    b = Math.min(255, Math.max(0, (b - 128) * contrast + 128));
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = Math.min(255, Math.max(0, gray + (r - gray) * saturation));
    g = Math.min(255, Math.max(0, gray + (g - gray) * saturation));
    b = Math.min(255, Math.max(0, gray + (b - gray) * saturation));
    r = Math.min(255, Math.max(0, r + tint[0] * 255));
    g = Math.min(255, Math.max(0, g + tint[1] * 255));
    b = Math.min(255, Math.max(0, b + tint[2] * 255));
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }
  ctx.putImageData(imageData, 0, 0);
}

function drawTextBar(ctx: CanvasRenderingContext2D, w: number, h: number, pos: string) {
  const barHeight = h * 0.22;
  let y: number;
  if (pos === 'top') y = 0;
  else if (pos === 'center') y = h / 2 - barHeight / 2;
  else y = h - barHeight;
  const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
  grad.addColorStop(0, 'rgba(0,0,0,0.92)');
  grad.addColorStop(0.15, 'rgba(0,0,0,0.82)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.72)');
  grad.addColorStop(0.85, 'rgba(0,0,0,0.82)');
  grad.addColorStop(1, 'rgba(0,0,0,0.92)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, w, barHeight);
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
    if (ctx.measureText(testLine).width > maxW && currentLine) { lines.push(currentLine); currentLine = word; }
    else { currentLine = testLine; }
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
  const barH = h * 0.2;
  let startY: number;
  if (pos === 'top') startY = (barH - th) / 2 + lh * 0.85;
  else if (pos === 'center') startY = (h - th) / 2 + lh * 0.8;
  else startY = (h - barH) + (barH - th) / 2 + lh * 0.85;
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
    const textGrad = ctx.createLinearGradient(w / 2 - 200, y - fs, w / 2 + 200, y + fs);
    textGrad.addColorStop(0, '#FFD700');
    textGrad.addColorStop(0.5, '#FFFFFF');
    textGrad.addColorStop(1, '#FFD700');
    ctx.fillStyle = textGrad;
    ctx.fillText(line, w / 2, y);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillText(line, w / 2, y - 2);
  }
}

function drawArrow(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w * 0.25, cy = h * 0.45, size = Math.min(w, h) * 0.08;
  ctx.save();
  ctx.shadowColor = 'rgba(255,215,0,0.6)';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(cx + size * 0.3, cy + size * 0.2, size * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,215,0,0.25)';
  ctx.fill();
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - size * 1.5, cy + size * 0.3);
  ctx.lineTo(cx + size * 0.5, cy + size * 0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = '#FFD700';
  ctx.moveTo(cx + size * 1.2, cy + size * 0.2);
  ctx.lineTo(cx + size * 0.3, cy - size * 0.3);
  ctx.lineTo(cx + size * 0.3, cy + size * 0.7);
  ctx.closePath();
  ctx.fill();
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
  const [activeTab, setActiveTab] = useState<'generate' | 'gallery'>('generate');
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
  const [exportSize, setExportSize] = useState('yt');
  const [usageToday, setUsageToday] = useState(0);
  const [usageAllTime, setUsageAllTime] = useState(0);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const stats = getUsageStats();
    setUsageToday(stats.today);
    setUsageAllTime(stats.allTime);
    setGallery(getGallery());
  }, []);

  const refreshUsage = useCallback(() => {
    const stats = getUsageStats();
    setUsageToday(stats.today);
    setUsageAllTime(stats.allTime);
  }, []);

  const showToastMsg = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const renderCanvas = useCallback(() => {
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
  }, [preset, overlayText, topic, textPos, showArrow]);

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
        body: JSON.stringify({ topic: topic.trim(), subjectDescription: subjectDesc.trim(), overlayText: overlayText.trim(), preset, intensity }),
      });
      const data = (await res.json()) as GenerateResponse;
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      if (data.imageUrl) {
        const img = await loadImage(data.imageUrl);
        bgImageRef.current = img;
        setImageUrl(data.imageUrl);
        setPromptText(data.prompt || '');
        renderCanvas();
        incrementUsage();
        refreshUsage();
        const item: GalleryItem = { id: Date.now().toString(), imageUrl: data.imageUrl, topic: topic.trim(), preset, timestamp: Date.now() };
        addToGallery(item);
        setGallery(getGallery());
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!canvasRef.current) return;
    const size = EXPORT_SIZES.find(s => s.id === exportSize) || EXPORT_SIZES[0];
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size.w;
    tempCanvas.height = size.h;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(canvasRef.current, 0, 0, size.w, size.h);
    showToastMsg(`Downloading ${size.label} (${size.w}x${size.h})...`);
    const a = document.createElement('a');
    a.href = tempCanvas.toDataURL('image/png');
    a.download = `${(overlayText || topic).replace(/\s+/g, '_').toUpperCase()}_${size.label}.png`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 100);
    showToastMsg('Downloaded!');
  }

  function handleLoadGalleryItem(item: GalleryItem) {
    setActiveTab('generate');
    setTopic(item.topic);
    setPreset(item.preset);
    loadImage(item.imageUrl).then(img => {
      bgImageRef.current = img;
      setImageUrl(item.imageUrl);
      renderCanvas();
    });
  }

  function handleDeleteGalleryItem(id: string) {
    removeFromGallery(id);
    setGallery(getGallery());
    showToastMsg('Removed from gallery');
  }

  function handleResetCounter() {
    localStorage.setItem(USAGE_KEY, '0');
    refreshUsage();
    showToastMsg('Counter reset');
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
          <span className="nav-badge"><span className="dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#00e676' }} /> Free Forever</span>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-badge"><span className="dot" /> YouTube Thumbnail Generator</div>
        <h1 className="hero-title">
          <span className="gradient-text">Pro YouTube Thumbnails with AI</span>
        </h1>
        <p className="hero-subtitle">
          AI generates unique subjects per topic — then we add bold text, color grading, and cinematic effects. Every thumbnail is different.
        </p>
      </section>

      <section id="generator" className="grid-2">
        <div className="card">
          <div className="tabs">
            <button className={`tab ${activeTab === 'generate' ? 'active' : ''}`} onClick={() => setActiveTab('generate')}>🎬 Generate</button>
            <button className={`tab ${activeTab === 'gallery' ? 'active' : ''}`} onClick={() => { setActiveTab('gallery'); setGallery(getGallery()); }}>🖼️ Gallery ({gallery.length})</button>
          </div>

          {activeTab === 'generate' ? (
            <>
              <div className="form-group">
                <label className="form-label">Video Topic *</label>
                <div className="input-wrapper">
                  <span className="input-icon">🎬</span>
                  <input type="text" placeholder="e.g. Python Tutorial, Gaming Montage, AI Revolution"
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
                <div className="chips" style={{ marginTop: '0.25rem' }}>
                  {SUBJECTS.map((s, i) => (
                    <button key={i} className={`chip ${subjectDesc === s ? 'active' : ''}`}
                      onClick={() => setSubjectDesc(s)} style={{ fontSize: '0.6rem' }}>{s.slice(0, 20)}..</button>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                  {PRESETS.map((p) => (
                    <div key={p.id} className={`preset-card ${preset === p.id ? 'active' : ''}`}
                      onClick={() => setPreset(p.id)}>
                      <div className="preset-name">{p.label}</div>
                      <div className="preset-desc">{p.desc}</div>
                      <div className="preset-colors">
                        {p.colors.map((c, i) => (<div key={i} className="preset-swatch" style={{ background: c }} />))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Text Position</label>
                  <div className="chips">
                    {['bottom', 'top', 'center'].map((p) => (
                      <button key={p} className={`chip ${textPos === p ? 'active' : ''}`} onClick={() => setTextPos(p)}>
                        {p === 'bottom' ? '⬇ Bottom' : p === 'top' ? '⬆ Top' : '⊙ Center'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Arrow</label>
                  <div className="chips">
                    <button className={`chip ${showArrow ? 'active' : ''}`} onClick={() => setShowArrow(!showArrow)}>
                      {showArrow ? '✓ Arrow ON' : '✗ Arrow OFF'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Intensity: {intensity}%</label>
                <input type="range" min="0" max="100" value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#ff0033' }} />
              </div>

              <button onClick={handleGenerate} disabled={loading || !topic.trim()} className="btn btn-primary">
                {loading ? '⏳ Generating...' : '🚀 Generate Thumbnail'}
              </button>

              {loading && (
                <div className="loading-container">
                  <div className="loading-text">🎨 AI creating your unique thumbnail...<br />This may take 10-30 seconds</div>
                  <div className="loading-bar-container"><div className="loading-bar" /></div>
                </div>
              )}

              {error && (
                <div className="error-display">
                  <span className="error-icon">⚠️</span>
                  <span className="error-text">{error}</span>
                </div>
              )}
            </>
          ) : (
            <div>
              {gallery.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '3rem', opacity: 0.3 }}>🖼️</span>
                  <h3 style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>No thumbnails yet</h3>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Generate your first thumbnail to see it here</p>
                </div>
              ) : (
                <div className="gallery-grid">
                  {gallery.map((item) => (
                    <div key={item.id} className="gallery-item" onClick={() => handleLoadGalleryItem(item)}>
                      <img src={item.imageUrl} alt={item.topic} loading="lazy" />
                      <div className="gallery-item-label">{item.topic}</div>
                      <div className="gallery-item-overlay">
                        <button className="preview-btn" onClick={(e) => { e.stopPropagation(); handleDeleteGalleryItem(item.id); }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Preview</span>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {imageUrl && <span style={{ fontSize: '0.6rem', color: '#00e5ff', padding: '0.15rem 0.4rem', background: 'rgba(0,229,255,0.1)', borderRadius: 4 }}>AI Generated</span>}
              <span style={{ fontSize: '0.6rem', color: '#FFD700', padding: '0.15rem 0.4rem', background: 'rgba(255,215,0,0.1)', borderRadius: 4 }}>{PRESETS.find(p => p.id === preset)?.label}</span>
            </div>
          </div>

          {!imageUrl && !loading && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '4rem', opacity: 0.3 }}>🎬</span>
              <h3 style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Your thumbnail appears here</h3>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Enter a topic and click Generate</p>
            </div>
          )}

          {imageUrl && (
            <div className="preview-container" style={{ marginBottom: '0.75rem' }}>
              <canvas ref={canvasRef} width={1920} height={1080} className="preview-canvas" onMouseUp={renderCanvas} />
              <div className="preview-overlay">
                <div className="preview-actions">
                  <button onClick={handleDownload} className="preview-btn">⬇ Download</button>
                  <button onClick={renderCanvas} className="preview-btn">🔄 Refresh</button>
                </div>
              </div>
            </div>
          )}

          {imageUrl && (
            <div className="export-sizes">
              {EXPORT_SIZES.map(s => (
                <div key={s.id} className={`export-size ${exportSize === s.id ? 'active' : ''}`}
                  onClick={() => setExportSize(s.id)}>
                  {s.label}<br /><span style={{ opacity: 0.6 }}>{s.w}x{s.h}</span>
                </div>
              ))}
            </div>
          )}

          {/* Usage Stats */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '0.75rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem' }}>📊</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Statistics</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: 'var(--text-muted)', padding: '0.1rem 0.4rem', borderRadius: 100, background: 'rgba(255,255,255,0.05)' }}>Daily</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Today</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: remaining > 0 ? '#00e676' : '#ff1744' }}>{usageToday} / {DAILY_LIMIT}</span>
            </div>
            <div className="usage-bar">
              <div className="usage-fill" style={{ width: usagePercent + '%', background: remaining > 50 ? 'linear-gradient(90deg, #00e676, #00c853)' : remaining > 10 ? 'linear-gradient(90deg, #ffd700, #ff9100)' : 'linear-gradient(90deg, #ff9100, #ff1744)' }} />
            </div>
            <div className="stats-row" style={{ marginTop: '0.5rem' }}>
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#00e676' }}>{Math.max(0, remaining)}</div>
                <div className="stat-label">Remaining</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#6c63ff' }}>{usageAllTime}</div>
                <div className="stat-label">All Time</div>
              </div>
            </div>
          </div>

          {promptText && (
            <div className="prompt-box">
              <details>
                <summary style={{ fontSize: '0.65rem', color: 'var(--text-muted)', cursor: 'pointer' }}>View AI Prompt</summary>
                <pre>{promptText}</pre>
              </details>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="feature-card">
          <div className="feature-icon">🎨</div>
          <div className="feature-title">AI-Powered</div>
          <div className="feature-desc">Every thumbnail is unique — AI generates different visuals for each topic</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <div className="feature-title">Instant</div>
          <div className="feature-desc">Generate pro thumbnails in seconds, not hours</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">💰</div>
          <div className="feature-title">100% Free</div>
          <div className="feature-desc">No API key, no signup, no limits — completely free forever</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <div className="feature-title">Topic-Aware</div>
          <div className="feature-desc">Detects your topic and adds matching visual elements</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📱</div>
          <div className="feature-title">Multi-Export</div>
          <div className="feature-desc">YouTube, Instagram, Twitter/X, 4K — export in any size</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🎬</div>
          <div className="feature-title">Canvas Effects</div>
          <div className="feature-desc">Color grading, vignette, bold text overlays, and arrows</div>
        </div>
      </section>

      <footer className="footer">
        <p>Powered by <a href="https://pollinations.ai" target="_blank" rel="noopener">Pollinations AI</a> — Free & Open Source</p>
        <div className="footer-links">
          <a href="https://github.com/engineermalik2029-alt/thumbnail-generator" target="_blank" rel="noopener">GitHub</a>
          <a href="https://pollinations.ai" target="_blank" rel="noopener">Pollinations</a>
        </div>
      </footer>

      <div className={`toast ${toast ? 'visible' : ''}`}>{toast}</div>
    </div>
  );
}