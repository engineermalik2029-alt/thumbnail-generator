'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface GenerateResponse {
  imageUrl?: string;
  topic: string;
  prompt: string;
  preset?: string;
  error?: string;
  provider?: string;
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

const ASPECT_RATIOS = [
  { id: 'yt', label: 'YouTube Thumbnail 16:9', w: 1280, h: 720, icon: '📺' },
  { id: 'ig_square', label: 'Instagram Square 1:1', w: 1080, h: 1080, icon: '📸' },
  { id: 'ig_story', label: 'Instagram Story 9:16', w: 1080, h: 1920, icon: '📱' },
  { id: 'tiktok', label: 'TikTok/Shorts 9:16', w: 1080, h: 1920, icon: '🎵' },
  { id: 'twitter_card', label: 'Twitter Card 16:9', w: 1280, h: 720, icon: '🐦' },
  { id: 'facebook', label: 'Facebook 1.91:1', w: 1200, h: 630, icon: '👥' },
  { id: 'linkedin', label: 'LinkedIn Banner 4:1', w: 1584, h: 396, icon: '💼' },
  { id: 'pinterest', label: 'Pinterest Pin 2:3', w: 1000, h: 1500, icon: '📌' },
  { id: 'whatsapp', label: 'WhatsApp Status 9:16', w: 1080, h: 1920, icon: '💬' },
  { id: 'snapchat', label: 'Snapchat 9:16', w: 1080, h: 1920, icon: '👻' },
  { id: 'yt_shorts', label: 'YouTube Shorts 9:16', w: 1080, h: 1920, icon: '🎬' },
  { id: 'twitter_post', label: 'Twitter Post 16:9', w: 1280, h: 720, icon: '🐦' },
  { id: 'ultra_wide', label: 'ULTRA WIDE 21:9', w: 2560, h: 1080, icon: '🖥️' },
  { id: 'cinema', label: 'CINEMA 2.39:1', w: 2560, h: 1072, icon: '🎬' },
  { id: 'banner', label: 'BANNER 3:1', w: 1920, h: 640, icon: '🎨' },
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
  const [geminiKey, setGeminiKey] = useState('');
  const [provider, setProvider] = useState('');
  const [aspectRatio, setAspectRatio] = useState('yt');
  const [customWidth, setCustomWidth] = useState(1280);
  const [customHeight, setCustomHeight] = useState(720);
  const [canvasWidth, setCanvasWidth] = useState(1920);
  const [canvasHeight, setCanvasHeight] = useState(1080);
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
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (bgImageRef.current) {
      ctx.drawImage(bgImageRef.current, 0, 0, canvasWidth, canvasHeight);
    }
    const displayText = (overlayText || topic).toUpperCase();
    drawTextBar(ctx, canvasWidth, canvasHeight, textPos);
    drawBoldText(ctx, displayText, canvasWidth, canvasHeight, textPos);
    if (showArrow) drawArrow(ctx, canvasWidth, canvasHeight);
  }, [preset, overlayText, topic, textPos, showArrow, canvasWidth, canvasHeight]);

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
        body: JSON.stringify({ topic: topic.trim(), subjectDescription: subjectDesc.trim(), overlayText: overlayText.trim(), preset, intensity, geminiApiKey: geminiKey, aspectRatio, customWidth, customHeight }),
      });
      const data = (await res.json()) as GenerateResponse;
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      if (data.imageUrl) {
        const img = await loadImage(data.imageUrl);
        bgImageRef.current = img;
        setImageUrl(data.imageUrl);
        setPromptText(data.prompt || '');
        setProvider(data.provider || 'pollinations');
        
        // Get response dimensions
        const respData = data as any;
        const respDims = respData.dimensions;
        
        // Set canvas dimensions from API response (scaled to fit preview)
        if (respDims && respDims.width && respDims.height) {
          const maxW = 800, maxH = 600;
          const scale = Math.min(maxW / respDims.width, maxH / respDims.height);
          setCanvasWidth(Math.floor(respDims.width * scale));
          setCanvasHeight(Math.floor(respDims.height * scale));
        }
        
        // Client-side smart upscaling for dimensions > 2048
        if (respDims && (respDims.width > 2048 || respDims.height > 2048)) {
          const finalW = respDims.width;
          const finalH = respDims.height;
          const upCanvas = document.createElement('canvas');
          upCanvas.width = finalW;
          upCanvas.height = finalH;
          const upCtx = upCanvas.getContext('2d');
          if (upCtx) {
            upCtx.imageSmoothingEnabled = true;
            upCtx.imageSmoothingQuality = 'high';
            upCtx.drawImage(img, 0, 0, finalW, finalH);
            const upDataUrl = upCanvas.toDataURL('image/png');
            setImageUrl(upDataUrl);
            setProvider(prev => prev + ' (AI Upscaled)');
            const upImg = new Image();
            upImg.onload = () => {
              bgImageRef.current = upImg;
              renderCanvas();
            };
            upImg.src = upDataUrl;
          }
        } else {
          renderCanvas();
        }
        
        incrementUsage();
        refreshUsage();
        const gi: GalleryItem = { id: Date.now().toString(), imageUrl: data.imageUrl, topic: topic.trim(), preset, timestamp: Date.now() };
        addToGallery(gi);
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
    const tmp = document.createElement('canvas');
    tmp.width = size.w;
    tmp.height = size.h;
    const ctx = tmp.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(canvasRef.current, 0, 0, size.w, size.h);
    showToastMsg(`Downloading ${size.label} (${size.w}x${size.h})...`);
    const a = document.createElement('a');
    a.href = tmp.toDataURL('image/png');
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

  const remaining = DAILY_LIMIT - usageToday;
  const usagePercent = Math.round((usageToday / DAILY_LIMIT) * 100);

  return (
    <div className="app">
      <div className="bg-mesh" />
      <div className="bg-grid" />

      <header className="header">
        <a href="/" className="logo">
          <div className="logo-mark">🎬</div>
          <div className="logo-text">Thumbnail<span>Forge</span></div>
        </a>
        <div className="header-actions">
          <div className="badge"><span className="badge-dot" /> FREE FOREVER</div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-tag"><span className="pulse" /> YouTube Thumbnail Generator</div>
        <h1>Pro YouTube Thumbnails<br /><span className="gradient">with AI</span></h1>
        <p>AI generates unique subjects per topic — then we add bold text, color grading, and cinematic effects. Every thumbnail is different.</p>
      </section>

      <section className="grid">
        <div className="card">
          <div className="tabs">
            <button className={`tab ${activeTab === 'generate' ? 'active' : ''}`} onClick={() => setActiveTab('generate')}>🎬 Generate</button>
            <button className={`tab ${activeTab === 'gallery' ? 'active' : ''}`} onClick={() => { setActiveTab('gallery'); setGallery(getGallery()); }}>🖼️ Gallery ({gallery.length})</button>
          </div>

          {activeTab === 'generate' ? (
            <>
              <div className="field">
                <label className="field-label">Video Topic *</label>
                <div className="field-wrap">
                  <span className="field-icon">🎬</span>
                  <input type="text" placeholder="e.g. Python Tutorial, Gaming Montage, AI Revolution"
                    value={topic} onChange={(e) => setTopic(e.target.value)} className="field-input" />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Subject Description</label>
                <div className="field-wrap">
                  <span className="field-icon">🧑</span>
                  <input type="text" placeholder="e.g. shocked young man in hoodie"
                    value={subjectDesc} onChange={(e) => setSubjectDesc(e.target.value)} className="field-input" />
                </div>
                <div className="chips" style={{ marginTop: '0.25rem' }}>
                  {SUBJECTS.map((s, i) => (
                    <button key={i} className={`chip ${subjectDesc === s ? 'active' : ''}`}
                      onClick={() => setSubjectDesc(s)}>{s.slice(0, 25)}..</button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="field-label">Text Overlay</label>
                <div className="field-wrap">
                  <span className="field-icon">📝</span>
                  <input type="text" placeholder="e.g. DON'T DO THIS (blank = topic)"
                    value={overlayText} onChange={(e) => setOverlayText(e.target.value)} className="field-input" />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Style Preset</label>
                <div className="preset-grid">
                  {PRESETS.map((p) => (
                    <div key={p.id} className={`preset ${preset === p.id ? 'active' : ''}`}
                      onClick={() => setPreset(p.id)}>
                      <div className="preset-name">{p.label}</div>
                      <div className="preset-desc">{p.desc}</div>
                      <div className="preset-swatches">
                        {p.colors.map((c, i) => (<div key={i} className="preset-swatch" style={{ background: c }} />))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="field">
                  <label className="field-label">Text Position</label>
                  <div className="chips">
                    {['bottom', 'top', 'center'].map((p) => (
                      <button key={p} className={`chip ${textPos === p ? 'active' : ''}`} onClick={() => setTextPos(p)}>
                        {p === 'bottom' ? '⬇ Bottom' : p === 'top' ? '⬆ Top' : '⊙ Center'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Arrow</label>
                  <div className="chips">
                    <button className={`chip ${showArrow ? 'active' : ''}`} onClick={() => setShowArrow(!showArrow)}>
                      {showArrow ? '✓ Arrow ON' : '✗ Arrow OFF'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="field">
                <label className="field-label">Intensity: {intensity}%</label>
                <input type="range" min="0" max="100" value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#6366f1' }} />
              </div>

              <details style={{ marginBottom: '0.875rem', cursor: 'pointer' }}>
                <summary style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '0.35rem' }}>
                  ⚙️ Settings {aspectRatio !== 'yt' ? `(${ASPECT_RATIOS.find(a => a.id === aspectRatio)?.label || 'Custom'})` : ''}
                </summary>
                <div style={{ padding: '0.5rem 0' }}>
                  <label className="field-label" style={{ marginBottom: '0.25rem' }}>📐 Aspect Ratio</label>
                  <div className="ratio-grid">
                    <div className="ratio-category">Square</div>
                    {ASPECT_RATIOS.filter(a => a.id === 'ig_square').map(ar => (
                      <div key={ar.id} className={`ratio-card ${aspectRatio === ar.id ? 'active' : ''}`}
                        onClick={() => setAspectRatio(ar.id)}>
                        <div className="ratio-visual"><div className="ratio-visual-inner" style={{ width: '22px', height: '22px' }} /></div>
                        <div className="ratio-info"><div className="ratio-name">{ar.label}</div><div className="ratio-dims">{ar.w}×{ar.h}</div></div>
                        <div className="ratio-icon">{ar.icon}</div>
                      </div>
                    ))}
                    <div className="ratio-category">Social Video 9:16</div>
                    {ASPECT_RATIOS.filter(a => ['ig_story','tiktok','whatsapp','snapchat','yt_shorts'].includes(a.id)).map(ar => (
                      <div key={ar.id} className={`ratio-card ${aspectRatio === ar.id ? 'active' : ''}`}
                        onClick={() => setAspectRatio(ar.id)}>
                        <div className="ratio-visual"><div className="ratio-visual-inner" style={{ width: '14px', height: '24px' }} /></div>
                        <div className="ratio-info"><div className="ratio-name">{ar.label}</div><div className="ratio-dims">{ar.w}×{ar.h}</div></div>
                        <div className="ratio-icon">{ar.icon}</div>
                      </div>
                    ))}
                    <div className="ratio-category">Standard 16:9</div>
                    {ASPECT_RATIOS.filter(a => ['yt','twitter_card','twitter_post'].includes(a.id)).map(ar => (
                      <div key={ar.id} className={`ratio-card ${aspectRatio === ar.id ? 'active' : ''}`}
                        onClick={() => setAspectRatio(ar.id)}>
                        <div className="ratio-visual"><div className="ratio-visual-inner" style={{ width: '24px', height: '14px' }} /></div>
                        <div className="ratio-info"><div className="ratio-name">{ar.label}</div><div className="ratio-dims">{ar.w}×{ar.h}</div></div>
                        <div className="ratio-icon">{ar.icon}</div>
                      </div>
                    ))}
                    <div className="ratio-category">Custom & Special</div>
                    {ASPECT_RATIOS.filter(a => ['facebook','linkedin','pinterest','ultra_wide','cinema','banner'].includes(a.id)).map(ar => (
                      <div key={ar.id} className={`ratio-card ${aspectRatio === ar.id ? 'active' : ''}`}
                        onClick={() => setAspectRatio(ar.id)}>
                        {ar.id === 'ultra_wide' ? <div className="ratio-visual"><div className="ratio-visual-inner" style={{ width: '28px', height: '12px' }} /></div> :
                         ar.id === 'cinema' ? <div className="ratio-visual"><div className="ratio-visual-inner" style={{ width: '28px', height: '11px' }} /></div> :
                         ar.id === 'banner' ? <div className="ratio-visual"><div className="ratio-visual-inner" style={{ width: '28px', height: '10px' }} /></div> :
                         ar.id === 'linkedin' ? <div className="ratio-visual"><div className="ratio-visual-inner" style={{ width: '28px', height: '7px' }} /></div> :
                         ar.id === 'facebook' ? <div className="ratio-visual"><div className="ratio-visual-inner" style={{ width: '24px', height: '13px' }} /></div> :
                         <div className="ratio-visual"><div className="ratio-visual-inner" style={{ width: '18px', height: '26px' }} /></div>}
                        <div className="ratio-info"><div className="ratio-name">{ar.label}</div><div className="ratio-dims">{ar.w}×{ar.h}</div></div>
                        <div className="ratio-icon">{ar.icon}</div>
                      </div>
                    ))}
                    <div className={`ratio-card ${aspectRatio === 'custom' ? 'active' : ''}`}
                      onClick={() => setAspectRatio('custom')}>
                      <div className="ratio-visual"><div className="ratio-visual-inner" style={{ width: '20px', height: '20px', border: '2px dashed rgba(255,255,255,0.3)', background: 'transparent', boxShadow: 'none' }} /></div>
                      <div className="ratio-info"><div className="ratio-name">Custom Size</div><div className="ratio-dims">Enter your own</div></div>
                      <div className="ratio-icon">🔧</div>
                    </div>
                  </div>

                  {aspectRatio === 'custom' && (
                    <div className="ratio-custom">
                      <div className="field" style={{ margin: 0 }}>
                        <label className="field-label">Width</label>
                        <input type="number" min={100} max={2560} value={customWidth}
                          onChange={(e) => setCustomWidth(Number(e.target.value))} className="field-input"
                          style={{ paddingLeft: '0.75rem' }} />
                      </div>
                      <div className="field" style={{ margin: 0 }}>
                        <label className="field-label">Height</label>
                        <input type="number" min={100} max={2560} value={customHeight}
                          onChange={(e) => setCustomHeight(Number(e.target.value))} className="field-input"
                          style={{ paddingLeft: '0.75rem' }} />
                      </div>
                    </div>
                  )}

                  <div className="field" style={{ marginTop: '0.75rem' }}>
                    <label className="field-label">🔑 Gemini API Key</label>
                    <div className="field-wrap">
                      <span className="field-icon">🔑</span>
                      <input type="password" placeholder="Paste Gemini key for better quality (optional)"
                        value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} className="field-input" />
                    </div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Get free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style={{ color: '#818cf8' }}>aistudio.google.com</a> — or leave blank for free Pollinations
                    </div>
                  </div>
                </div>
              </details>

              <button onClick={handleGenerate} disabled={loading || !topic.trim()} className="btn-primary">
                {loading ? '⏳ Generating...' : geminiKey ? '🚀 Generate with Gemini' : '🚀 Generate with Pollinations'}
              </button>

              {loading && (
                <div className="loading">
                  <div className="loading-text">🎨 AI creating your unique thumbnail...<br />This may take 10-30 seconds</div>
                  <div className="loading-bar-outer"><div className="loading-bar-inner" /></div>
                </div>
              )}

              {error && (
                <div className="error-box">
                  <span className="icon">⚠️</span>
                  <span className="msg">{error}</span>
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
                <div className="gallery">
                  {gallery.map((item) => (
                    <div key={item.id} className="gallery-item" onClick={() => handleLoadGalleryItem(item)}>
                      <img src={item.imageUrl} alt={item.topic} loading="lazy" />
                      <div className="gallery-item-label">{item.topic}</div>
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
              {imageUrl && <span className="badge" style={{ margin: 0, fontSize: '0.55rem', background: provider?.includes('Gemini') ? 'rgba(99,102,241,0.1)' : 'rgba(0,229,255,0.1)', borderColor: provider?.includes('Gemini') ? 'rgba(99,102,241,0.2)' : 'rgba(0,229,255,0.2)', color: provider?.includes('Gemini') ? '#818cf8' : '#00e5ff' }}>{provider?.includes('Gemini') ? '🧠 Gemini' : provider?.includes('Upscaled') ? '🚀 AI Upscaled' : '🎨 AI'}</span>}
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
            <div className="preview-wrap" style={{ marginBottom: '0.75rem' }}>
              <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight} className="preview-canvas" style={{ maxWidth: '100%', height: 'auto' }} onMouseUp={renderCanvas} />
              <div className="preview-bar">
                <button onClick={handleDownload} className="btn-sm">⬇ Download</button>
                <button onClick={renderCanvas} className="btn-sm">🔄 Refresh</button>
              </div>
            </div>
          )}

          {imageUrl && (
            <div className="exports">
              {EXPORT_SIZES.map(s => (
                <div key={s.id} className={`export-btn ${exportSize === s.id ? 'active' : ''}`}
                  onClick={() => setExportSize(s.id)}>
                  {s.label}<span>{s.w}x{s.h}</span>
                </div>
              ))}
            </div>
          )}

          <div className="stats-panel">
            <div className="stats-header">
              <span>📊</span>
              <span className="label">Statistics</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.55rem', color: 'var(--text-muted)', padding: '0.1rem 0.4rem', borderRadius: 100, background: 'rgba(255,255,255,0.05)' }}>Daily</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Today</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: remaining > 0 ? '#22c55e' : '#ef4444' }}>{usageToday} / {DAILY_LIMIT}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: usagePercent + '%', background: usagePercent > 50 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : usagePercent > 10 ? 'linear-gradient(90deg, #eab308, #f59e0b)' : 'linear-gradient(90deg, #f59e0b, #ef4444)' }} />
            </div>
            <div className="stats-row">
              <div className="stat">
                <div className="stat-value" style={{ color: '#22c55e' }}>{Math.max(0, remaining)}</div>
                <div className="stat-label">Remaining</div>
              </div>
              <div className="stat">
                <div className="stat-value" style={{ color: '#818cf8' }}>{usageAllTime}</div>
                <div className="stat-label">All Time</div>
              </div>
            </div>
          </div>

          {promptText && (
            <div className="prompt-box">
              <details>
                <summary>View AI Prompt</summary>
                <pre>{promptText}</pre>
              </details>
            </div>
          )}
        </div>
      </section>

      <section className="features">
        <div className="feature">
          <div className="icon">🎨</div>
          <h3>AI-Powered</h3>
          <p>Every thumbnail is unique — AI generates different visuals for each topic</p>
        </div>
        <div className="feature">
          <div className="icon">⚡</div>
          <h3>Instant</h3>
          <p>Generate pro thumbnails in seconds, not hours</p>
        </div>
        <div className="feature">
          <div className="icon">💰</div>
          <h3>100% Free</h3>
          <p>No API key, no signup, no limits — completely free forever</p>
        </div>
        <div className="feature">
          <div className="icon">🎯</div>
          <h3>Topic-Aware</h3>
          <p>Detects your topic and adds matching visual elements</p>
        </div>
        <div className="feature">
          <div className="icon">📱</div>
          <h3>16 Aspect Ratios</h3>
          <p>YouTube, Instagram, TikTok, Twitter, Facebook, LinkedIn, Pinterest + Ultra Wide, Cinema, Banner & Custom</p>
        </div>
        <div className="feature">
          <div className="icon">🎬</div>
          <h3>Canvas Overlay</h3>
          <p>Bold text, color grading, vignette, and arrow overlays</p>
        </div>
      </section>

      <footer className="footer">
        <p>Powered by <a href="https://pollinations.ai" target="_blank" rel="noopener">Pollinations AI</a> — Free & Open Source</p>
        <div className="footer-links">
          <a href="https://github.com/engineermalik2029-alt/thumbnail-generator" target="_blank" rel="noopener">GitHub</a>
          <a href="https://pollinations.ai" target="_blank" rel="noopener">Pollinations</a>
        </div>
      </footer>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}