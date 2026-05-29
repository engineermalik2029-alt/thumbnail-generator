'use client';

import { useState, useEffect, useRef } from 'react';

interface GradientData { name: string; colors: string[]; accent: string }
interface GenerateResponse {
  imageUrl?: string; gradient?: GradientData; topic: string; prompt: string;
  preset?: string; creativity?: number; error?: string;
}
interface ThumbnailData extends GenerateResponse { id: number }

const SUBJECTS = [
  'a shocked young man in hoodie pointing at camera',
  'a woman with wide eyes and open mouth in surprise',
  'a confident person smiling with arms crossed',
  'a gamer wearing headphones looking intensely',
  'a person holding glowing object looking amazed',
];

const PRESETS = [
  { id: 'harry', label: 'Harry Style', desc: 'Yellow text + dark bg + arrows', colors: ['#FFD700', '#0a0a2e', '#FFFFFF'] },
  { id: 'tech', label: 'Tech Thriller', desc: 'Blue/orange contrast + glowing', colors: ['#0066ff', '#ff6b00', '#0a1628'] },
  { id: 'gaming', label: 'Gaming Explosive', desc: 'Red/yellow + fire/lightning', colors: ['#ff0033', '#ffd700', '#1a1a1a'] },
];

export default function Home() {
  const [topic, setTopic] = useState('');
  const [subjectDesc, setSubjectDesc] = useState('');
  const [overlayText, setOverlayText] = useState('');
  const [preset, setPreset] = useState('harry');
  const [creativity, setCreativity] = useState(7);
  const [loading, setLoading] = useState(false);
  const [thumbnails, setThumbnails] = useState<ThumbnailData[]>([]);
  const [toast, setToast] = useState('');
  const [activeId, setActiveId] = useState(0);
  const [textPos, setTextPos] = useState('bottom');
  const [showArrow, setShowArrow] = useState(false);
  const [isAiMode, setIsAiMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  async function handleGenerate() {
    if (!topic.trim()) return;
    setLoading(true); setThumbnails([]); setActiveId(0);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(), subjectDescription: subjectDesc.trim(),
          overlayText: overlayText.trim(), imageModel: 'flux',
          preset, creativity, guidanceScale: 7, variant: 0,
        }),
      });
      const data = (await res.json()) as GenerateResponse;
      if (!res.ok) throw new Error(data.error || 'Failed');
      setThumbnails([{ ...data, id: Date.now() } as ThumbnailData]);
      setIsAiMode(!!data.imageUrl);
    } catch (e: any) {
      setThumbnails([{ topic: '', prompt: '', id: Date.now(), error: e.message }]);
    } finally { setLoading(false); }
  }

  // Canvas rendering with all graphical elements
  function renderCanvas(thumb: ThumbnailData) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 1920, 1080);

    // Step 1: Draw background (AI image or gradient)
    if (thumb.imageUrl && imgRef.current && imgRef.current.complete) {
      ctx.drawImage(imgRef.current, 0, 0, 1920, 1080);
    } else if (thumb.gradient) {
      drawGradientBg(ctx, 1920, 1080, thumb.gradient);
    } else {
      drawGradientBg(ctx, 1920, 1080, { name: 'Default', colors: ['#0a0a2e', '#1a1a4e'], accent: '#FFD700' });
    }

    const displayText = (overlayText || thumb.topic).toUpperCase();

    // Step 2: Draw semi-transparent gradient bar behind text
    drawTextBar(ctx, 1920, 1080, textPos);

    // Step 3: Draw bold text with black outline + drop shadow
    drawBoldText(ctx, displayText, 1920, 1080, textPos);

    // Step 4: Draw arrow/circle if enabled
    if (showArrow) {
      drawGraphicalElements(ctx, 1920, 1080);
    }
  }

  useEffect(() => {
    if (thumbnails.length > 0 && !thumbnails[activeId]?.error) {
      renderCanvas(thumbnails[activeId]);
    }
  });

  // Image load handler
  function handleImageLoad() {
    const thumb = thumbnails[activeId];
    if (thumb?.imageUrl) renderCanvas(thumb);
  }

  async function handleDownload() {
    const thumb = thumbnails[activeId];
    if (!thumb) return;
    showToast('Rendering...');
    const canvas = document.createElement('canvas');
    canvas.width = 1920; canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (thumb.imageUrl) {
      try {
        const img = await loadImage(thumb.imageUrl);
        ctx.drawImage(img, 0, 0, 1920, 1080);
      } catch (e) { if (thumb.gradient) drawGradientBg(ctx, 1920, 1080, thumb.gradient); }
    } else if (thumb.gradient) {
      drawGradientBg(ctx, 1920, 1080, thumb.gradient);
    }

    const displayText = (overlayText || thumb.topic).toUpperCase();
    drawTextBar(ctx, 1920, 1080, textPos);
    drawBoldText(ctx, displayText, 1920, 1080, textPos);
    if (showArrow) drawGraphicalElements(ctx, 1920, 1080);

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = displayText.replace(/\s+/g, '_') + '_thumbnail.png';
    document.body.appendChild(a); a.click();
    setTimeout(() => document.body.removeChild(a), 100);
    showToast('Downloaded!');
  }

  const activeThumb = thumbnails[activeId];

  return (
    <div className="main-container">
      <nav className="nav">
        <a href="/" className="nav-logo">
          <div className="nav-logo-icon">🎬</div>
          <span className="nav-logo-text">Thumbnail<span>Forge Pro</span></span>
        </a>
        <div className="nav-actions">
          <a href="https://github.com/engineermalik2029-alt/thumbnail-generator" target="_blank" className="nav-btn" rel="noreferrer">Star</a>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-badge"><span className="dot" /> YouTube-Style Thumbnails</div>
        <h1 className="hero-title">
          <span className="gradient-text">Pro YouTube Thumbnail Generator</span>
        </h1>
        <p className="hero-subtitle">
          CodeWithHarry-style thumbnails: bold text, vibrant colors, arrows, and expressive faces. Just like top Indian YouTubers.
        </p>
      </section>

      <section id="generator" className="grid-2">
        {/* Settings Panel */}
        <div className="card">
          <div className="card-header"><span className="card-title">Settings</span></div>

          {/* Topic */}
          <div className="form-group">
            <label className="form-label">Video Topic</label>
            <div className="input-wrapper">
              <span className="input-icon">🎬</span>
              <input type="text" placeholder="e.g. Python Tutorial for Beginners"
                value={topic} onChange={(e) => setTopic(e.target.value)} className="input-field" />
            </div>
          </div>

          {/* Subject */}
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

          {/* Text Overlay */}
          <div className="form-group">
            <label className="form-label">Text Overlay</label>
            <div className="input-wrapper">
              <span className="input-icon">📝</span>
              <input type="text" placeholder="e.g. NEVER DO THIS (blank = topic)"
                value={overlayText} onChange={(e) => setOverlayText(e.target.value)} className="input-field" />
            </div>
          </div>

          {/* Style Preset */}
          <div className="form-group">
            <label className="form-label">Style Preset</label>
            <div className="chips" style={{ flexDirection: 'column', gap: '0.3rem' }}>
              {PRESETS.map((p) => (
                <button key={p.id} className={'chip ' + (preset === p.id ? 'active' : '')}
                  style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem' }}
                  onClick={() => setPreset(p.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {p.colors.map((c, i) => (
                        <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
                      ))}
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

          {/* Text Position */}
          <div className="form-group">
            <label className="form-label">Text Position</label>
            <div className="chips">
              {['bottom', 'top', 'center'].map((p) => (
                <button key={p} className={'chip ' + (textPos === p ? 'active' : '')}
                  onClick={() => setTextPos(p)}>
                  {p === 'bottom' ? 'Bottom' : p === 'top' ? 'Top' : 'Center'}
                </button>
              ))}
            </div>
          </div>

          {/* Graphical Elements */}
          <div className="form-group">
            <label className="form-label">Graphical Elements</label>
            <div className="chips">
              <button className={'chip ' + (showArrow ? 'active' : '')}
                onClick={() => setShowArrow(!showArrow)}>
                {showArrow ? 'Hide Arrow' : 'Show Arrow/Circle'}
              </button>
            </div>
          </div>

          {/* Creativity Slider */}
          <div className="form-group">
            <label className="form-label">Creativity: {creativity}/10</label>
            <input type="range" min="1" max="10" value={creativity}
              onChange={(e) => setCreativity(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#ff0033' }} />
          </div>

          {/* Generate */}
          <button onClick={handleGenerate} disabled={loading || !topic.trim()} className="btn btn-primary">
            {loading ? 'Generating...' : 'Generate YouTube Thumbnail'}
          </button>

          {loading && (
            <div className="loading-container">
              <div className="loading-text">Creating your YouTube-style thumbnail...</div>
              <div className="loading-bar-container"><div className="loading-bar" /></div>
            </div>
          )}

          {activeThumb?.error && (
            <div className="error-display"><span className="error-icon">⚠️</span><span className="error-text">{activeThumb.error}</span></div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Preview</span>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              {isAiMode && <span style={{ fontSize: '0.65rem', color: '#00e5ff' }}>AI</span>}
              {preset && <span style={{ fontSize: '0.65rem', color: '#FFD700' }}>{PRESETS.find(p => p.id === preset)?.label}</span>}
            </div>
          </div>

          {thumbnails.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '4rem', opacity: 0.3 }}>🎬</span>
              <h3 style={{ color: 'var(--text-secondary)' }}>Your thumbnail will appear here</h3>
              <p style={{ fontSize: '0.85rem' }}>Enter topic, choose preset, and generate</p>
            </div>
          )}

          {thumbnails.length > 0 && !activeThumb?.error && (
            <>
              <div className="image-card" style={{ marginBottom: '0.75rem', cursor: 'default' }}>
                {/* Hidden image for loading AI image into canvas */}
                {activeThumb.imageUrl && (
                  <img ref={imgRef} src={activeThumb.imageUrl}
                    onLoad={handleImageLoad} style={{ display: 'none' }} crossOrigin="anonymous" />
                )}
                <canvas ref={canvasRef} width={1920} height={1080}
                  style={{ width: '100%', aspectRatio: '16/9', borderRadius: 'var(--radius-md)' }} />
                <div className="image-card-overlay" style={{ opacity: 1, justifyContent: 'center', gap: '0.75rem' }}>
                  <button onClick={handleDownload} className="image-card-btn" style={{ width: 40, height: 40 }} title="Download">⬇</button>
                  <button onClick={() => { renderCanvas(activeThumb); showToast('Rendered!'); }} className="image-card-btn" style={{ width: 40, height: 40 }} title="Refresh">🔄</button>
                </div>
              </div>

              <div className="prompt-box">
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  AI Prompt
                </span>
                <pre style={{ maxHeight: '100px', fontSize: '0.7rem' }}>{activeThumb.prompt}</pre>
              </div>
            </>
          )}
        </div>
      </section>

      <footer className="footer">
        <p>Powered by <a href="https://github.com/HiDream-ai/HiDream-O1-Image" target="_blank">HiDream AI</a></p>
      </footer>

      <div className={'toast ' + (toast ? 'visible' : '')}>{toast}</div>
    </div>
  );
}

// ========== CANVAS RENDERING FUNCTIONS ==========

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawGradientBg(ctx: CanvasRenderingContext2D, w: number, h: number, g: GradientData) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  g.colors.forEach((c, i) => grad.addColorStop(i / (g.colors.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0, 0, w, h);
}

function drawTextBar(ctx: CanvasRenderingContext2D, w: number, h: number, pos: string) {
  const barHeight = h * 0.2;
  let y: number;
  if (pos === 'top') y = 0;
  else if (pos === 'center') y = h / 2 - barHeight / 2;
  else y = h - barHeight;

  // Dark gradient bar
  const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
  grad.addColorStop(0, 'rgba(0,0,0,0.85)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.7)');
  grad.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, w, barHeight);

  // Top accent line
  ctx.fillStyle = 'rgba(255,215,0,0.3)';
  ctx.fillRect(0, y, w, 3);
}

function drawBoldText(ctx: CanvasRenderingContext2D, text: string, w: number, h: number, pos: string) {
  if (!text) return;

  // Calculate font size
  let fs = Math.min(130, Math.floor(w / (text.length * 0.55)));
  fs = Math.max(40, fs);
  ctx.font = '900 ' + fs + 'px "Arial Black", Impact, sans-serif';

  // Word wrap
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
    ctx.font = '900 ' + fs + 'px "Arial Black", Impact, sans-serif';
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

  // Draw each line with DROP SHADOW + THICK BLACK OUTLINE
  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lh;
    const line = lines[i];

    // DROP SHADOW
    ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 6;
    ctx.shadowOffsetY = 6;

    // THICK BLACK OUTLINE (pass 1)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(8, fs * 0.15);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeText(line, w / 2, y);

    // THICK BLACK OUTLINE (pass 2 - for extra thickness)
    ctx.lineWidth = Math.max(6, fs * 0.1);
    ctx.strokeText(line, w / 2, y);

    // Remove shadow before fill
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // FILL: White with slight yellow tint like CodeWithHarry
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(line, w / 2, y);

    // Slight yellow highlight on top (Harry style)
    ctx.fillStyle = 'rgba(255,215,0,0.08)';
    ctx.fillText(line, w / 2, y - 1);
  }
}

function drawGraphicalElements(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Yellow painted arrow pointing to center-left (like CodeWithHarry style)
  const cx = w * 0.25;
  const cy = h * 0.45;
  const size = Math.min(w, h) * 0.08;

  ctx.save();

  // Glow effect
  ctx.shadowColor = 'rgba(255,215,0,0.6)';
  ctx.shadowBlur = 20;

  // Yellow painted circle (brush stroke style)
  ctx.beginPath();
  ctx.arc(cx + size * 0.3, cy + size * 0.2, size * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,215,0,0.25)';
  ctx.fill();

  // Arrow pointing toward subject
  ctx.shadowBlur = 15;
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255,215,0,0.5)';

  // Arrow line
  ctx.beginPath();
  ctx.moveTo(cx - size * 1.5, cy + size * 0.3);
  ctx.lineTo(cx + size * 0.5, cy + size * 0.2);
  ctx.stroke();

  // Arrow head
  ctx.beginPath();
  ctx.fillStyle = '#FFD700';
  ctx.shadowBlur = 15;
  ctx.moveTo(cx + size * 1.2, cy + size * 0.2);
  ctx.lineTo(cx + size * 0.3, cy - size * 0.3);
  ctx.lineTo(cx + size * 0.3, cy + size * 0.7);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Second smaller accent arrow on right side
  ctx.save();
  ctx.strokeStyle = 'rgba(255,215,0,0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.75, h * 0.3);
  ctx.quadraticCurveTo(w * 0.8, h * 0.45, w * 0.75, h * 0.55);
  ctx.stroke();
  ctx.restore();
}