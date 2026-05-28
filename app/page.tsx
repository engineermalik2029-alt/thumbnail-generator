'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface GenerateResponse {
  imageUrl: string;
  prompt: string;
  topic: string;
  error?: string;
}

interface ThumbnailData {
  imageUrl: string;
  prompt: string;
  topic: string;
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
  { id: 'flux', label: '🎨 Creative & Bold', desc: 'Vibrant colors, dramatic effects' },
  { id: 'flux-realism', label: '📸 Photorealistic', desc: 'Realistic scenes, cinematic look' },
  { id: 'flux-anime', label: '🌸 Anime Style', desc: 'Japanese anime aesthetic' },
];

const FONTS = [
  { name: 'Arial Black', label: '🔴 Bold Impact' },
  { name: 'Impact', label: '⚫ Classic Impact' },
  { name: 'Arial', label: '🔵 Clean Modern' },
  { name: 'Georgia', label: '🟡 Serif Premium' },
];

const TEXT_POSITIONS = ['bottom', 'top', 'center'];

// YouTube-style colors
const TEXT_COLORS = [
  { fill: '#FFFFFF', stroke: '#000000', glow: true, label: 'White/Black (Classic)' },
  { fill: '#FFD700', stroke: '#000000', glow: true, label: 'Gold/Black' },
  { fill: '#FF0033', stroke: '#000000', glow: true, label: 'Red/Black' },
  { fill: '#00E5FF', stroke: '#000000', glow: true, label: 'Cyan/Black' },
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
  
  // If only one line but too long, force split
  if (lines.length === 1 && ctx.measureText(lines[0]).width > maxWidth) {
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  }
  
  return lines;
}

function drawThumbnailText(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  position: string,
  font: string,
  color: typeof TEXT_COLORS[0]
) {
  // Font sizing based on text length
  const maxWidth = width * 0.85;
  let fontSize = Math.min(120, Math.floor(width / (text.length * 0.6)));
  fontSize = Math.max(36, fontSize);
  
  // Set font for measurement
  ctx.font = `900 ${fontSize}px "${font}", Arial Black, Impact, sans-serif`;
  
  // Break text into lines
  const lines = wrapText(ctx, text.toUpperCase(), maxWidth);
  const lineCount = lines.length;
  
  // Adjust font size if multiple lines
  if (lineCount > 1) {
    fontSize = Math.min(90, Math.floor(width / (Math.max(...lines.map(l => l.length)) * 0.55)));
    fontSize = Math.max(28, fontSize);
    ctx.font = `900 ${fontSize}px "${font}", Arial Black, Impact, sans-serif`;
  }
  
  const lineHeight = fontSize * 1.15;
  const totalHeight = lineCount * lineHeight;
  
  // Calculate Y position
  let startY: number;
  const padding = height * 0.08;
  switch (position) {
    case 'top': startY = padding + lineHeight; break;
    case 'center': startY = (height - totalHeight) / 2 + lineHeight * 0.8; break;
    case 'bottom': default: startY = height - padding - totalHeight + lineHeight * 0.85; break;
  }
  
  // Text effects
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Draw each line
  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lineHeight;
    const line = lines[i];
    
    // Shadow (glow effect)
    if (color.glow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;
    }
    
    // Thick outline for readability
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = fontSize * 0.12;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeText(line, width / 2, y);
    
    // Additional outline layer for more visibility
    ctx.lineWidth = fontSize * 0.06;
    ctx.strokeStyle = color.stroke;
    ctx.strokeText(line, width / 2, y);
    
    // Fill text
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = color.fill;
    ctx.fillText(line, width / 2, y);
    
    // Inner glow / highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillText(line, width / 2, y - fontSize * 0.02);
  }
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
  const [textPosition, setTextPosition] = useState('bottom');
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

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
        if (!res.ok) throw new Error(data.error || 'Generation failed');
        return { ...data, id: Date.now() + i };
      });

      const generated = await Promise.all(promises);
      setThumbnails(generated);
    } catch (e: any) {
      setThumbnails([{ imageUrl: '', prompt: '', topic: '', error: e.message, id: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const compositeImage = useCallback((imageUrl: string, text: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 1920;
        canvas.height = img.naturalHeight || 1080;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('No canvas context')); return; }

        // Draw background image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Draw YouTube-style text overlay
        drawThumbnailText(ctx, text, canvas.width, canvas.height, textPosition, textFont, textColor);

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        // If image fails, create a colored background with text
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('No canvas context')); return; }

        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, 1920, 1080);
        gradient.addColorStop(0, '#ff0033');
        gradient.addColorStop(0.5, '#6c63ff');
        gradient.addColorStop(1, '#00e5ff');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1920, 1080);

        // Decorative circles
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(
            200 + Math.random() * 1500,
            200 + Math.random() * 600,
            50 + Math.random() * 200,
            0, Math.PI * 2
          );
          ctx.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.05})`;
          ctx.fill();
        }

        drawThumbnailText(ctx, text, 1920, 1080, textPosition, textFont, textColor);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = imageUrl;
    });
  }, [textPosition, textFont, textColor]);

  const handleDownload = async (thumb: ThumbnailData) => {
    try {
      showToast('⏳ Rendering thumbnail with text...');
      const dataUrl = await compositeImage(thumb.imageUrl, thumb.topic);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${thumb.topic.replace(/\s+/g, '_').toLowerCase()}_thumbnail.png`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 100);
      showToast('✅ Downloaded to your computer!');
    } catch {
      // Fallback: download raw image
      try {
        const res = await fetch(thumb.imageUrl);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${thumb.topic.replace(/\s+/g, '_').toLowerCase()}_thumbnail.png`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        showToast('✅ Downloaded!');
      } catch {
        window.open(thumb.imageUrl, '_blank');
        showToast('Right-click → Save as PNG');
      }
    }
  };

  const handleCopyImage = async (thumb: ThumbnailData) => {
    try {
      const dataUrl = await compositeImage(thumb.imageUrl, thumb.topic);
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast('✅ Image copied!');
    } catch {
      await navigator.clipboard.writeText(thumb.imageUrl);
      showToast('✅ URL copied!');
    }
  };

  const handleCopyPrompt = async (prompt: string) => {
    await navigator.clipboard.writeText(prompt);
    showToast('✅ Prompt copied!');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && topic.trim()) handleGenerate();
  };

  const activeThumb = thumbnails[activeId];

  return (
    <div className="main-container">
      {/* Navigation */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          <div className="nav-logo-icon">🎨</div>
          <span className="nav-logo-text">Thumbnail<span>Forge</span></span>
        </a>
        <div className="nav-actions">
          <a href="#generator" className="nav-link">Generator</a>
          <a href="https://github.com/engineermalik2029-alt/thumbnail-generator" target="_blank" className="nav-btn" rel="noreferrer">⭐ Star on GitHub</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-badge"><span className="dot" /> 🔥 Free • No Signup • AI-Powered</div>
        <h1 className="hero-title">
          <span className="gradient-text">Professional YouTube Thumbnails<br />Generated by AI</span>
        </h1>
        <p className="hero-subtitle">
          AI generates stunning backgrounds — then we add bold YouTube-style text overlays. 
          Results look like a pro designer made them.
        </p>
      </section>

      {/* Generator */}
      <section id="generator" className="grid-2">
        {/* Left Panel */}
        <div className="card">
          <div className="card-header"><span className="card-title">⚙️ Thumbnail Settings</span></div>

          <div className="form-group">
            <label className="form-label">🎬 Video Topic</label>
            <div className="input-wrapper">
              <span className="input-icon">🎬</span>
              <input
                type="text"
                placeholder="e.g. Top 10 Python Tips for Beginners"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={handleKeyDown}
                className="input-field"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">🎨 Quick Topics</label>
            <div className="chips">
              {TOPICS.slice(0, 5).map((t) => (
                <button key={t} className={`chip ${topic === t ? 'active' : ''}`} onClick={() => setTopic(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">🎨 Background Style</label>
            <div className="chips" style={{ flexDirection: 'column', gap: '0.3rem' }}>
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  className={`chip ${model === s.id ? 'active' : ''}`}
                  style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start', padding: '0.5rem 0.75rem' }}
                  onClick={() => setModel(s.id)}
                >
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">🔤 Text Style</label>
            <div className="chips">
              {FONTS.map((f) => (
                <button key={f.name} className={`chip ${textFont === f.name ? 'active' : ''}`} onClick={() => setTextFont(f.name)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">🎨 Text Color</label>
            <div className="chips">
              {TEXT_COLORS.map((c, i) => (
                <button
                  key={i}
                  className={`chip ${textColor.fill === c.fill ? 'active' : ''}`}
                  onClick={() => setTextColor(c)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">📍 Text Position</label>
            <div className="chips">
              {TEXT_POSITIONS.map((p) => (
                <button key={p} className={`chip ${textPosition === p ? 'active' : ''}`} onClick={() => setTextPosition(p)}>
                  {p === 'bottom' ? '⬇ Bottom' : p === 'top' ? '⬆ Top' : '⬛ Center'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">📦 Generate</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div className="select-wrapper" style={{ width: '100px' }}>
                <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="select-field" style={{ padding: '0.8rem 1rem' }}>
                  <option value={1}>1 image</option>
                  <option value={2}>2 images</option>
                  <option value={3}>3 images</option>
                </select>
              </div>
              <button onClick={handleGenerate} disabled={loading || !topic.trim()} className="btn btn-primary" style={{ flex: 1 }}>
                {loading ? (
                  <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Generating...</>
                ) : (
                  <><span>✨</span> Generate Thumbnails</>
                )}
              </button>
            </div>
          </div>

          {loading && (
            <div className="loading-container">
              <div className="loading-text">
                🎨 Generating {count} background{count > 1 ? 's' : ''}...
                <br /><span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Creating scenes, then applying text overlays</span>
              </div>
              <div className="loading-bar-container"><div className="loading-bar" /></div>
            </div>
          )}

          {activeThumb?.error && (
            <div className="error-display">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{activeThumb.error}</span>
            </div>
          )}
        </div>

        {/* Right Panel - Result */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              {thumbnails.length > 0 && !activeThumb?.error
                ? `🎯 ${thumbnails.length} Thumbnail${thumbnails.length > 1 ? 's' : ''}`
                : '🎯 Preview'}
            </span>
          </div>

          {thumbnails.length === 0 && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              <span style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.3 }}>🎨</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Your thumbnails will appear here</h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '300px', lineHeight: 1.5 }}>
                Enter a topic, choose your style, and generate pro thumbnails
              </p>
            </div>
          )}

          {thumbnails.length > 0 && !activeThumb?.error && (
            <>
              {thumbnails.length > 1 && (
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  {thumbnails.map((t, i) => (
                    <button key={t.id} className={`chip ${activeId === i ? 'active' : ''}`} onClick={() => setActiveId(i)}>
                      Thumbnail {i + 1}
                    </button>
                  ))}
                </div>
              )}

              {/* Canvas with composited image */}
              <div className="image-card" style={{ cursor: 'default', marginBottom: '0.75rem', position: 'relative' }}>
                <canvas
                  ref={canvasRef}
                  width={1920}
                  height={1080}
                  style={{ width: '100%', aspectRatio: '16/9', borderRadius: 'var(--radius-md)' }}
                />
                <img
                  ref={imageRef}
                  src={activeThumb.imageUrl}
                  alt={`Background for ${activeThumb.topic}`}
                  crossOrigin="anonymous"
                  style={{ display: 'none' }}
                  onLoad={() => {
                    const canvas = canvasRef.current;
                    const img = imageRef.current;
                    if (!canvas || !img) return;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;

                    // Draw background
                    ctx.drawImage(img, 0, 0, 1920, 1080);

                    // Draw text overlay
                    drawThumbnailText(ctx, activeThumb.topic, 1920, 1080, textPosition, textFont, textColor);
                  }}
                />
                <div className="image-card-overlay" style={{ opacity: 1, justifyContent: 'center', gap: '0.75rem' }}>
                  <button onClick={() => handleDownload(activeThumb)} className="image-card-btn" title="Download" style={{ width: 40, height: 40 }}>⬇</button>
                  <button onClick={() => handleCopyImage(activeThumb)} className="image-card-btn" title="Copy Image" style={{ width: 40, height: 40 }}>📋</button>
                  <button onClick={() => handleCopyPrompt(activeThumb.prompt)} className="image-card-btn" title="Copy Prompt" style={{ width: 40, height: 40 }}>📝</button>
                </div>
              </div>

              {/* Prompt Box */}
              <div className="prompt-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600 }}>🤖 AI Background Prompt</span>
                  <button onClick={() => handleCopyPrompt(activeThumb.prompt)} className="btn btn-sm btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.65rem' }}>📋 Copy</button>
                </div>
                <pre>{activeThumb.prompt}</pre>
              </div>

              {/* Thumbnails Grid */}
              {thumbnails.length > 1 && (
                <div className="result-grid">
                  {thumbnails.map((t, i) => (
                    <div key={t.id} className="image-card" onClick={() => setActiveId(i)}
                      style={{ border: activeId === i ? '2px solid var(--primary)' : '1px solid var(--border-color)' }}>
                      <img src={t.imageUrl} alt={`Thumb ${i + 1}`} className="image-card-img" crossOrigin="anonymous" />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>Built with ❤️ using <a href="https://nextjs.org" target="_blank" rel="noreferrer">Next.js</a> & <a href="https://pollinations.ai" target="_blank" rel="noreferrer">Pollinations AI</a> • <a href="https://github.com/engineermalik2029-alt/thumbnail-generator" target="_blank" rel="noreferrer">Open Source</a></p>
      </footer>

      {/* Toast */}
      <div className={`toast ${toast ? 'visible' : ''}`}>{toast}</div>
    </div>
  );
}