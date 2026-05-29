'use client';

import { useState, useCallback, useEffect } from 'react';

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
];

const SUBJECT_EXAMPLES = [
  'a shocked young man in a hoodie pointing at the camera',
  'a woman with wide eyes and mouth open in surprise',
  'a confident person smiling with arms crossed',
  'a gamer wearing headphones looking intensely at screen',
  'a person holding a glowing object looking amazed',
];

const TEXT_COLORS = [
  { fill: '#FFFFFF', stroke: '#000000', glow: true, label: 'White/Black' },
  { fill: '#FFD700', stroke: '#000000', glow: true, label: 'Gold/Black' },
  { fill: '#FF0033', stroke: '#000000', glow: true, label: 'Red/Black' },
  { fill: '#00E5FF', stroke: '#000000', glow: true, label: 'Cyan/Black' },
  { fill: '#000000', stroke: '#FFFFFF', glow: false, label: 'Black/White' },
];

const FONTS = [
  { name: 'Arial Black', label: 'Bold Impact' },
  { name: 'Impact', label: 'Classic Impact' },
  { name: 'Arial', label: 'Clean Modern' },
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
    gr.addColorStop(0, gl.c + '40');
    gr.addColorStop(1, 'transparent');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(gl.x, gl.y, gl.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTextOverlay(
  ctx: CanvasRenderingContext2D, text: string, w: number, h: number,
  pos: string, font: string, colorIdx: number
) {
  if (!text) return;
  const color = TEXT_COLORS[colorIdx];
  const maxW = w * 0.88;
  let fs = Math.min(140, Math.floor(w / (text.length * 0.55)));
  fs = Math.max(36, fs);
  ctx.font = '900 ' + fs + 'px "' + font + '", Arial Black, Impact, sans-serif';
  const lines = wrapText(ctx, text.toUpperCase(), maxW);
  if (lines.length > 1) {
    const maxLen = Math.max.apply(null, lines.map(function(l) { return l.length; }));
    fs = Math.min(90, Math.floor(w / (maxLen * 0.5)));
    fs = Math.max(30, fs);
    ctx.font = '900 ' + fs + 'px "' + font + '", Arial Black, Impact, sans-serif';
  }
  const lh = fs * 1.2;
  const th = lines.length * lh;
  var sy: number;
  const pad = h * 0.08;
  if (pos === 'top') { sy = pad + lh; }
  else if (pos === 'center') { sy = (h - th) / 2 + lh * 0.8; }
  else { sy = h - pad - th + lh * 0.85; }
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
  return new Promise(function(resolve, reject) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() { resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

export default function Home() {
  const [topic, setTopic] = useState('');
  const [subjectDesc, setSubjectDesc] = useState('');
  const [overlayText, setOverlayText] = useState('');
  const [model, setModel] = useState('flux');
  const [loading, setLoading] = useState(false);
  const [thumbnails, setThumbnails] = useState<ThumbnailData[]>([]);
  const [toast, setToast] = useState('');
  const [activeId, setActiveId] = useState(0);
  const [textFont, setTextFont] = useState('Arial Black');
  const [textPos, setTextPos] = useState('bottom');
  const [textColorIdx, setTextColorIdx] = useState(0);
  const [isAiMode, setIsAiMode] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(function() { setToast(''); }, 2500);
  }

  async function handleGenerate() {
    if (!topic.trim()) return;
    setLoading(true);
    setThumbnails([]);
    setActiveId(0);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          subjectDescription: subjectDesc.trim(),
          overlayText: overlayText.trim(),
          imageModel: model,
          variant: 0,
        }),
      });
      const data = (await res.json()) as GenerateResponse;
      if (!res.ok) throw new Error(data.error || 'Failed');
      setThumbnails([{ ...data, id: Date.now() } as ThumbnailData]);
      setIsAiMode(!!data.imageUrl);
    } catch (e: any) {
      setThumbnails([{ topic: '', prompt: '', id: Date.now(), error: e.message }]);
    } finally {
      setLoading(false);
    }
  }

  function renderCanvas(thumb: ThumbnailData) {
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 1920, 1080);
    const displayText = overlayText || thumb.topic;
    if (thumb.imageUrl) {
      loadImage(thumb.imageUrl).then(function(img) {
        ctx.drawImage(img, 0, 0, 1920, 1080);
        drawTextOverlay(ctx, displayText, 1920, 1080, textPos, textFont, textColorIdx);
      }).catch(function() {
        if (thumb.gradient) drawGradientBg(ctx, 1920, 1080, thumb.gradient);
        drawTextOverlay(ctx, displayText, 1920, 1080, textPos, textFont, textColorIdx);
      });
    } else if (thumb.gradient) {
      drawGradientBg(ctx, 1920, 1080, thumb.gradient);
      drawTextOverlay(ctx, displayText, 1920, 1080, textPos, textFont, textColorIdx);
    }
  }

  useEffect(() => {
    if (thumbnails.length > 0 && !thumbnails[activeId]?.error) {
      renderCanvas(thumbnails[activeId]);
    }
  });

  async function handleDownload() {
    const thumb = thumbnails[activeId];
    if (!thumb) return;
    showToast('Rendering...');
    const displayText = overlayText || thumb.topic;
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (thumb.imageUrl) {
      try {
        const img = await loadImage(thumb.imageUrl);
        ctx.drawImage(img, 0, 0, 1920, 1080);
      } catch (e) {
        if (thumb.gradient) drawGradientBg(ctx, 1920, 1080, thumb.gradient);
      }
    } else if (thumb.gradient) {
      drawGradientBg(ctx, 1920, 1080, thumb.gradient);
    }
    drawTextOverlay(ctx, displayText, 1920, 1080, textPos, textFont, textColorIdx);
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = displayText.replace(/\s+/g, '_').toLowerCase() + '_thumbnail.png';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() { document.body.removeChild(a); }, 100);
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
          <a href="https://github.com/engineermalik2029-alt/thumbnail-generator" target="_blank" className="nav-btn" rel="noreferrer">Star on GitHub</a>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-badge"><span className="dot" /> AI Cinematic Thumbnails Free</div>
        <h1 className="hero-title">
          <span className="gradient-text">Cinematic AI YouTube Thumbnails</span>
        </h1>
        <p className="hero-subtitle">
          Hyper-realistic, 8K cinematic thumbnails with dramatic lighting, expressive subjects, and bold text overlays.
        </p>
      </section>

      <section id="generator" className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">Settings</span></div>

          <div className="form-group">
            <label className="form-label">Video Topic</label>
            <div className="input-wrapper">
              <span className="input-icon">🎬</span>
              <input type="text" placeholder="e.g. NEVER DO THIS in Python"
                value={topic} onChange={(e) => setTopic(e.target.value)}
                className="input-field" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Subject Description</label>
            <div className="input-wrapper">
              <span className="input-icon">🧑</span>
              <input type="text" placeholder="e.g. shocked young man in hoodie pointing at camera"
                value={subjectDesc} onChange={(e) => setSubjectDesc(e.target.value)}
                className="input-field" />
            </div>
            <div className="chips" style={{ marginTop: '0.3rem' }}>
              {SUBJECT_EXAMPLES.map((s, i) => (
                <button key={i} className={'chip ' + (subjectDesc === s ? 'active' : '')}
                  onClick={() => setSubjectDesc(s)} style={{ fontSize: '0.7rem' }}>{s.slice(0, 20)}..</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Text Overlay</label>
            <div className="input-wrapper">
              <span className="input-icon">📝</span>
              <input type="text" placeholder="e.g. NEVER DO THIS (leave blank for topic)"
                value={overlayText} onChange={(e) => setOverlayText(e.target.value)}
                className="input-field" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Style</label>
            <div className="chips" style={{ flexDirection: 'column', gap: '0.3rem' }}>
              <button className={'chip ' + (model === 'flux' ? 'active' : '')}
                style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem' }}
                onClick={() => setModel('flux')}>
                <div><div style={{ fontWeight: 600 }}>Cinematic Bold</div><div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Dramatic, intense</div></div>
              </button>
              <button className={'chip ' + (model === 'flux-realism' ? 'active' : '')}
                style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem' }}
                onClick={() => setModel('flux-realism')}>
                <div><div style={{ fontWeight: 600 }}>Premium Realistic</div><div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Natural, sophisticated</div></div>
              </button>
              <button className={'chip ' + (model === 'flux-anime' ? 'active' : '')}
                style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem' }}
                onClick={() => setModel('flux-anime')}>
                <div><div style={{ fontWeight: 600 }}>Anime Cinematic</div><div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Vibrant, magical</div></div>
              </button>
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

          <button onClick={handleGenerate} disabled={loading || !topic.trim()} className="btn btn-primary">
            {loading ? 'Generating...' : 'Generate Cinematic Thumbnail'}
          </button>

          {loading && (
            <div className="loading-container">
              <div className="loading-text">AI crafting your cinematic thumbnail with 8K detail...</div>
              <div className="loading-bar-container"><div className="loading-bar" /></div>
            </div>
          )}

          {activeThumb?.error && (
            <div className="error-display"><span className="error-icon">⚠️</span><span className="error-text">{activeThumb.error}</span></div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Preview</span>
            {isAiMode && <span style={{ fontSize: '0.65rem', color: 'var(--accent)' }}>AI Generated</span>}
          </div>

          {thumbnails.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '4rem', opacity: 0.3 }}>🎬</span>
              <h3 style={{ color: 'var(--text-secondary)' }}>Your cinematic thumbnail</h3>
              <p style={{ fontSize: '0.85rem' }}>Enter topic and generate</p>
            </div>
          )}

          {thumbnails.length > 0 && !activeThumb?.error && (
            <>
              <div className="image-card" style={{ marginBottom: '0.75rem' }}>
                <canvas id="mainCanvas" width={1920} height={1080}
                  style={{ width: '100%', aspectRatio: '16/9', borderRadius: 'var(--radius-md)' }} />
                <div className="image-card-overlay" style={{ opacity: 1, justifyContent: 'center', gap: '0.75rem' }}>
                  <button onClick={handleDownload} className="image-card-btn" style={{ width: 40, height: 40 }}>⬇</button>
                </div>
              </div>

              <div className="prompt-box">
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  AI Prompt
                </span>
                <pre style={{ maxHeight: '120px', fontSize: '0.7rem' }}>{activeThumb.prompt}</pre>
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