'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface GradientData {
  name: string;
  colors: string[];
  accent: string;
}

interface GenerateResponse {
  imageUrl?: string;
  gradient?: GradientData;
  topic: string;
  prompt: string;
  error?: string;
}

interface ThumbnailData {
  imageUrl?: string;
  gradient?: GradientData;
  topic: string;
  prompt: string;
  id: number;
  error?: string;
}

const TOPICS = [
  'Python Tutorial for Beginners',
  'Top 10 JavaScript Tips',
  'I Tried 100 Side Hustles',
  'React vs Angular 2024',
  'How AI Changed My Life',
  'This One Trick Changed Everything',
  'I Built a Startup in 24 Hours',
  'The Truth About Coding',
  '5 Habits of Millionaires',
  'Why You Keep Failing',
];

const STYLES = [
  { id: 'flux', label: '🎨 Creative & Bold', desc: 'Vibrant, dramatic, high-impact' },
  { id: 'flux-realism', label: '📸 Premium & Professional', desc: 'Rich, realistic, sophisticated' },
  { id: 'flux-anime', label: '🌸 Anime & Vibrant', desc: 'Pastel, neon, magical' },
];

const FONTS = [
  { name: 'Arial Black', label: '🔴 Bold Impact' },
  { name: 'Impact', label: '⚫ Classic Impact' },
  { name: 'Arial', label: '🔵 Clean Modern' },
  { name: 'Georgia', label: '🟡 Serif Premium' },
];

const TEXT_POSITIONS = ['bottom', 'top', 'center'];

const TEXT_COLORS = [
  { fill: '#FFFFFF', stroke: '#000000', glow: true, label: 'White/Black' },
  { fill: '#FFD700', stroke: '#000000', glow: true, label: 'Gold/Black' },
  { fill: '#FF0033', stroke: '#000000', glow: true, label: 'Red/Black' },
  { fill: '#00E5FF', stroke: '#000000', glow: true, label: 'Cyan/Black' },
  { fill: '#000000', stroke: '#FFFFFF', glow: false, label: 'Black/White' },
];

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  if (lines.length === 1 && ctx.measureText(lines[0]).width > maxWidth) {
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  }
  return lines;
}

function drawGradientBg(ctx: CanvasRenderingContext2D, w: number, h: number, g: GradientData) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  g.colors.forEach((c, i) => grad.addColorStop(i / (g.colors.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0, 0, w, h);
  const glows = [
    { x: w * 0.2, y: h * 0.15, r: w * 0.3, c: g.colors[0] },
    { x: w * 0.8, y: h * 0.8, r: w * 0.25, c: g.colors[g.colors.length - 1] },
  ];
  for (const gl of glows) {
    const gr = ctx.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, gl.r);
    gr.addColorStop(0, gl.c + '50');
    gr.addColorStop(0.5, gl.c + '20');
    gr.addColorStop(1, 'transparent');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(gl.x, gl.y, gl.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawThumbnailText(
  ctx: CanvasRenderingContext2D, text: string, w: number, h: number,
  pos: string, font: string, color: typeof TEXT_COLORS[0]
) {
  const maxW = w * 0.85;
  let fs = Math.min(140, Math.floor(w / (text.length * 0.55)));
  fs = Math.max(40, fs);
  ctx.font = `900 ${fs}px "${font}", Arial Black, Impact, sans-serif`;
  const lines = wrapText(ctx, text.toUpperCase(), maxW);
  if (lines.length > 1) {
    fs = Math.min(100, Math.floor(w / (Math.max(...lines.map(l => l.length)) * 0.5)));
    fs = Math.max(32, fs);
    ctx.font = `900 ${fs}px "${font}", Arial Black, Impact, sans-serif`;
  }
  const lh = fs * 1.2;
  const th = lines.length * lh;
  let sy: number;
  const pad = h * 0.08;
  if (pos === 'top') sy = pad + lh;
  else if (pos === 'center') sy = (h - th) / 2 + lh * 0.8;
  else sy = h - pad - th + lh * 0.85;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < lines.length; i++) {
    const y = sy + i * lh;
    const line = lines[i];
    if (color.glow) {
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 25;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;
    }
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = fs * 0.13;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeText(line, w / 2, y);
    ctx.lineWidth = fs * 0.07;
    ctx.strokeText(line, w / 2, y);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = color.fill;
    ctx.fillText(line, w / 2, y);
  }
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

async function compositeImage(
  thumb: ThumbnailData, pos: string, font: string, color: typeof TEXT_COLORS[0]
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (thumb.imageUrl) {
    try {
      const img = await loadImage(thumb.imageUrl);
      ctx.drawImage(img, 0, 0, 1920, 1080);
    } catch {
      drawGradientBg(ctx, 1920, 1080, { name: 'Fallback', colors: ['#1a0033', '#4a0072'], accent: '#7c4dff' });
    }
  } else if (thumb.gradient) {
    drawGradientBg(ctx, 1920, 1080, thumb.gradient);
  } else {
    drawGradientBg(ctx, 1920, 1080, { name: 'Default', colors: ['#0f0c29', '#302b63'], accent: '#00e5ff' });
  }

  drawThumbnailText(ctx, thumb.topic, 1920, 1080, pos, font, color);
  return canvas.toDataURL('image/png');
}

export default function Home() {
  const [topic, setTopic] = useState('');
  const [model, setModel] = useState('flux');
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [thumbnails, setThumbnails] = useState<ThumbnailData[]>([]);
  const [toast, setToast] = useState('');
  const [activeId, setActiveId] = useState(0);
  const [textFont, setTextFont] = useState('Arial Black');
  const [textPos, setTextPos] = useState('bottom');
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]);
  const [isAiMode, setIsAiMode] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setThumbnails([]);
    setActiveId(0);
    try {
      const promises = Array.from({ length: count }, async (_, i) => {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: topic.trim(), imageModel: model, variant: i }),
        });
        const data = await res.json() as GenerateResponse;
        if (!res.ok) throw new Error(data.error || 'Failed');
        return { ...data, id: Date.now() + i } as ThumbnailData;
      });
      const generated = await Promise.all(promises);
      setThumbnails(generated);
      setIsAiMode(!!generated[0]?.imageUrl);
    } catch (e: any) {
      setThumbnails([{ topic: '', prompt: '', id: Date.now(), error: e.message }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMainCanvas = useCallback((thumb: ThumbnailData) => {
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 1920, 1080);
    if (thumb.imageUrl) {
      loadImage(thumb.imageUrl).then(img => {
        ctx.drawImage(img, 0, 0, 1920, 1080);
        drawThumbnailText(ctx, thumb.topic, 1920, 1080, textPos, textFont, textColor);
      }).catch(() => {
        if (thumb.gradient) drawGradientBg(ctx, 1920, 1080, thumb.gradient);
        drawThumbnailText(ctx, thumb.topic, 1920, 1080, textPos, textFont, textColor);
      });
    } else if (thumb.gradient) {
      drawGradientBg(ctx, 1920, 1080, thumb.gradient);
      drawThumbnailText(ctx, thumb.topic, 1920, 1080, textPos, textFont, textColor);
    }
  }, [textPos, textFont, textColor]);

  useEffect(() => {
    if (thumbnails.length > 0 && !thumbnails[activeId]?.error) {
      renderMainCanvas(thumbnails[activeId]);
    }
  }, [thumbnails, activeId, renderMainCanvas]);

  const handleDownload = async () => {
    const thumb = thumbnails[activeId];
    if (!thumb) return;
    showToast('⏳ Rendering...');
    const dataUrl = await compositeImage(thumb, textPos, textFont, textColor);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${thumb.topic.replace(/\s+/g, '_').toLowerCase()}_thumbnail.png`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 100);
    showToast('✅ Downloaded!');
  };

  const handleCopyImage = async () => {
    const thumb = thumbnails[activeId];
    if (!thumb) return;
    const dataUrl = await compositeImage(thumb, textPos, textFont, textColor);
    const blob = await (await fetch(dataUrl)).blob();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    showToast('✅ Copied!');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && topic.trim()) handleGenerate();
  };

  const activeThumb = thumbnails[activeId];

  return (
    <div className="main-container">
      <nav className="nav">
        <a href="/" className="nav-logo">
          <div className="nav-logo-icon">🎨</div>
          <span className="nav-logo-text">Thumbnail<span>Forge Pro</span></span>
        </a>
        <div className="nav-actions">
          <a href="#generator" className="nav-link">Generator</a>
          <a href="https://github.com/engineermalik2029-alt/thumbnail-generator" target="_blank" className="nav-btn" rel="noreferrer">⭐ Star</a>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-badge"><span className="dot" /> 🔥 AI-Powered • Free • No Signup</div>
        <h1 className="hero-title">
          <span className="gradient-text">Professional YouTube Thumbnails<br />Powered by AI</span>
        </h1>
        <p className="hero-subtitle">
          AI generates stunning custom backgrounds — then we add bold YouTube-style text overlays.
          Results that look like a professional designer made them.
        </p>
        <div className="hero-stats">
          <div className="hero-stat"><div className="hero-stat-value">AI</div><div className="hero-stat-label">Custom Backgrounds</div></div>
          <div className="hero-stat"><div className="hero-stat-value">3</div><div className="hero-stat-label">Design Styles</div></div>
          <div className="hero-stat"><div className="hero-stat-value">4K</div><div className="hero-stat-label">Output Quality</div></div>
        </div>
      </section>

      <section id="generator" className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">⚙️ Settings</span></div>

          <div className="form-group">
            <label className="form-label">🎬 Video Topic</label>
            <div className="input-wrapper">
              <span className="input-icon">🎬</span>
              <input type="text" placeholder="e.g. Top 10 Python Tips"
                value={topic} onChange={(e) => setTopic(e.target.value)}
                onKeyDown={handleKeyDown} className="input-field" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">🎨 Quick Topics</label>
            <div className="chips">
              {TOPICS.slice(0, 5).map((t) => (
                <button key={t} className={`chip ${topic === t ? 'active' : ''}`} onClick={() => setTopic(t)}>{t}</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">🎨 Background Style</label>
            <div className="chips" style={{ flexDirection: 'column', gap: '0.3rem' }}>
              {STYLES.map((s) => (
                <button key={s.id} className={`chip ${model === s.id ? 'active' : ''}`}
                  style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem' }}
                  onClick={() => setModel(s.id)}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">🔤 Font</label>
            <div className="chips">
              {FONTS.map((f) => (
                <button key={f.name} className={`chip ${textFont === f.name ? 'active' : ''}`} onClick={() => setTextFont(f.name)}>{f.label}</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">🎨 Text Color</label>
            <div className="chips">
              {TEXT_COLORS.map((c, i) => (
                <button key={i} className={`chip ${textColor.fill === c.fill ? 'active' : ''}`} onClick={() => setTextColor(c)}>{c.label}</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">📍 Text Position</label>
            <div className="chips">
              {TEXT_POSITIONS.map((p) => (
                <button key={p} className={`chip ${textPos === p ? 'active' : ''}`} onClick={() => setTextPos(p)}>
                  {p === 'bottom' ? '⬇ Bottom' : p === 'top' ? '⬆ Top' : '⬛ Center'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">📦 Generate</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="select-wrapper" style={{ width: '90px' }}>
                <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="select-field" style={{ padding: '0.8rem 1rem' }}>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
              <button onClick={handleGenerate} disabled={loading || !topic.trim()} className="btn btn-primary" style={{ flex: 1 }}>
                {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Generating...</> : <><span>✨</span> Generate</>}
              </button>
            </div>
          </div>

          {loading && (
            <div className="loading-container">
              <div className="loading-text">🎨 AI is creating your custom background...</div>
              <div className="loading-bar-container"><div className="loading-bar" /></div>
            </div>
          )}

          {activeThumb?.error && (
            <div className="error-display"><span className="error-icon">⚠️</span><span className="error-text">{activeThumb.error}</span></div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">
              {thumbnails.length > 0 && !activeThumb?.error
                ? `🎯 ${thumbnails.length} Generated` : '🎯 Preview'}
            </span>
            {isAiMode && activeThumb && (
              <span style={{ fontSize: '0.65rem', color: 'var(--accent)' }}>🤖 AI Background</span>
            )}
          </div>

          {thumbnails.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '4rem', opacity: 0.3 }}>🎨</span>
              <h3 style={{ color: 'var(--text-secondary)', margin: '0.5rem 0' }}>Your thumbnail will appear here</h3>
              <p style={{ fontSize: '0.85rem' }}>Enter a topic and generate</p>
            </div>
          )}

          {thumbnails.length > 0 && !activeThumb?.error && (
            <>
              {thumbnails.length > 1 && (
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  {thumbnails.map((t, i) => (
                    <button key={t.id} className={`chip ${activeId === i ? 'active' : ''}`} onClick={() => setActiveId(i)}>
                      #{i + 1}
                    </button>
                  ))}
                </div>
              )}

              <div className="image-card" style={{ marginBottom: '0.75rem' }}>
                <canvas id="mainCanvas" width={1920} height={1080}
                  style={{ width: '100%', aspectRatio: '16/9', borderRadius: 'var(--radius-md)' }} />
                <div className="image-card-overlay" style={{ opacity: 1, justifyContent: 'center', gap: '0.75rem' }}>
                  <button onClick={handleDownload} className="image-card-btn" style={{ width: 40, height: 40 }}>⬇</button>
                  <button onClick={handleCopyImage} className="image-card-btn" style={{ width: 40, height: 40 }}>📋</button>
                </div>
              </div>

              <div className="prompt-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    🤖 AI Prompt
                  </span>
                </div>
                <pre>{activeThumb.prompt}</pre>
              </div>

              {thumbnails.length > 1 && (
                <div className="result-grid">
                  {thumbnails.map((t, i) => (
                    <div key={t.id} className="image-card" onClick={() => setActiveId(i)}
                      style={{ border: activeId === i ? '2px solid var(--primary)' : '1px solid var(--border-color)' }}>
                      <canvas width={1920} height={1080}
                        style={{ width: '100%', aspectRatio: '16/9', borderRadius: 'var(--radius-sm)' }}
                        ref={(el) => {
                          if (!el) return;
                          const ctx = el.getContext('2d');
                          if (!ctx) return;
                          if (t.gradient) drawGradientBg(ctx, 1920, 1080, t.gradient);
                          drawThumbnailText(ctx, t.topic, 1920, 1080, textPos, textFont, textColor);
                        }} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <footer className="footer">
        <p>Built with ❤️ using <a href="https://nextjs.org" target="_blank">Next.js</a> & <a href="https://github.com/HiDream-ai/HiDream-O1-Image" target="_blank">HiDream AI</a> • <a href="https://github.com/engineermalik2029-alt/thumbnail-generator" target="_blank">Open Source</a></p>
      </footer>

      <div className={`toast ${toast ? 'visible' : ''}`}>{toast}</div>
    </div>
  );
}