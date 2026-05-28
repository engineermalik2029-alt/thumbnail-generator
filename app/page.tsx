'use client';

import { useState } from 'react';

interface GenerateResponse {
  imageUrl: string;
  prompt: string;
  topic: string;
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
  { id: 'flux', label: '🎨 Creative & Bold', desc: 'Vibrant colors, dramatic effects, text overlays' },
  { id: 'flux-realism', label: '📸 Photorealistic', desc: 'Realistic scenes, cinematic lighting, pro look' },
  { id: 'flux-anime', label: '🌸 Anime Style', desc: 'Japanese anime aesthetic, bold outlines' },
];

export default function Home() {
  const [topic, setTopic] = useState('');
  const [model, setModel] = useState('flux');
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GenerateResponse[]>([]);
  const [toast, setToast] = useState('');
  const [activeResult, setActiveResult] = useState(0);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setResults([]);
    setActiveResult(0);

    try {
      // Generate multiple variants
      const promises = Array.from({ length: count }, async (_, i) => {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: topic.trim(),
            imageModel: model,
            variant: i,
          }),
        });
        const data = await res.json() as GenerateResponse;
        if (!res.ok) throw new Error(data.error || 'Generation failed');
        return data;
      });

      const generated = await Promise.all(promises);
      setResults(generated);
    } catch (e: any) {
      setResults([{ imageUrl: '', prompt: '', topic: '', error: e.message }]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (imageUrl: string, idx: number) => {
    const filename = `${topic.replace(/\s+/g, '_').toLowerCase()}_thumbnail_${idx + 1}.png`;
    try {
      // Try blob download first (works with same-origin)
      const res = await fetch(imageUrl, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        // Convert to PNG if needed
        const pngBlob = new Blob([blob], { type: 'image/png' });
        const url = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        showToast('✅ Downloaded!');
        return;
      }
      throw new Error('Fetch failed');
    } catch (_e1) {
      // Fallback: open image in new tab with download attribute via data URL
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); }, 100);
        showToast('✅ Downloaded!');
      } catch (_e2) {
        // Last resort: open in new tab
        window.open(imageUrl, '_blank');
        showToast('Right-click image → Save as PNG');
      }
    }
  };

  const handleCopyImage = async (imageUrl: string) => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      showToast('✅ Image copied!');
    } catch (_e3) {
      await navigator.clipboard.writeText(imageUrl);
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
          <a href="https://github.com/engineermalik2029-alt/thumbnail-generator" target="_blank" className="nav-btn" rel="noreferrer">
            ⭐ Star on GitHub
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-badge">
          <span className="dot" />
          🔥 Free • No Signup • AI-Powered
        </div>
        <h1 className="hero-title">
          <span className="gradient-text">Professional YouTube Thumbnails<br />Generated by AI</span>
        </h1>
        <p className="hero-subtitle">
          Create click-worthy thumbnails that top YouTubers would be proud of. 
          Just enter your topic and get pro-designed thumbnails with text overlays, 
          cinematic lighting, and bold compositions — completely free.
        </p>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-value">Free</div>
            <div className="hero-stat-label">No API Key Needed</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">3×</div>
            <div className="hero-stat-label">Style Variants</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">4K</div>
            <div className="hero-stat-label">Resolution</div>
          </div>
        </div>
      </section>

      {/* Generator Section */}
      <section id="generator" className="grid-2">
        {/* Left Panel - Controls */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">⚙️ Thumbnail Settings</span>
          </div>

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
                <button
                  key={t}
                  className={`chip ${topic === t ? 'active' : ''}`}
                  onClick={() => setTopic(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">🎨 Thumbnail Style</label>
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
                    <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '0.15rem' }}>{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">📦 Generate</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div className="select-wrapper" style={{ width: '100px' }}>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="select-field"
                  style={{ padding: '0.8rem 1rem' }}
                >
                  <option value={1}>1 image</option>
                  <option value={2}>2 images</option>
                  <option value={3}>3 images</option>
                </select>
              </div>
              <button
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    Generating...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    Generate Thumbnails
                  </>
                )}
              </button>
            </div>
          </div>

          {loading && (
            <div className="loading-container">
              <div className="loading-text">
                🎨 Generating {count} professional thumbnail{count > 1 ? 's' : ''}...
                <br />
                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                  Crafting compositions, applying text overlays, optimizing colors
                </span>
              </div>
              <div className="loading-bar-container">
                <div className="loading-bar" />
              </div>
            </div>
          )}

          {results.length > 0 && results[0]?.error && (
            <div className="error-display">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{results[0].error}</span>
            </div>
          )}
        </div>

        {/* Right Panel - Results */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              {results.length > 0 && !results[0]?.error
                ? `🎯 ${results.length} Thumbnail${results.length > 1 ? 's' : ''} Generated`
                : '🎯 Preview'}
            </span>
            {results.length > 0 && !results[0]?.error && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Click thumbnail to view actions
              </span>
            )}
          </div>

          {results.length === 0 && !loading && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '4rem 2rem', color: 'var(--text-muted)', textAlign: 'center',
            }}>
              <span style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.3 }}>🎨</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Your thumbnails will appear here
              </h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '300px', lineHeight: 1.5 }}>
                Enter a video topic and click generate to create professional AI thumbnails
              </p>
            </div>
          )}

          {results.length > 0 && !results[0]?.error && (
            <>
              {/* Image Tabs */}
              {results.length > 1 && (
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  {results.map((_, i) => (
                    <button
                      key={i}
                      className={`chip ${activeResult === i ? 'active' : ''}`}
                      onClick={() => setActiveResult(i)}
                    >
                      Thumbnail {i + 1}
                    </button>
                  ))}
                </div>
              )}

              {/* Main Image */}
              <div className="image-card" style={{ cursor: 'default', marginBottom: '0.75rem' }}>
                <img
                  src={results[activeResult].imageUrl}
                  alt={`Thumbnail ${activeResult + 1}`}
                  className="image-card-img"
                  style={{ aspectRatio: '16/9' }}
                  crossOrigin="anonymous"
                />
                <div className="image-card-overlay" style={{ opacity: 1, justifyContent: 'center', gap: '0.75rem' }}>
                  <button
                    onClick={() => handleDownload(results[activeResult].imageUrl, activeResult)}
                    className="image-card-btn"
                    title="Download"
                    style={{ width: 40, height: 40 }}
                  >⬇</button>
                  <button
                    onClick={() => handleCopyImage(results[activeResult].imageUrl)}
                    className="image-card-btn"
                    title="Copy Image"
                    style={{ width: 40, height: 40 }}
                  >📋</button>
                  <button
                    onClick={() => handleCopyPrompt(results[activeResult].prompt)}
                    className="image-card-btn"
                    title="Copy Prompt"
                    style={{ width: 40, height: 40 }}
                  >📝</button>
                </div>
              </div>

              {/* Prompt */}
              <div className="prompt-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600 }}>
                    🤖 AI Prompt Used
                  </span>
                  <button
                    onClick={() => handleCopyPrompt(results[activeResult].prompt)}
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.65rem' }}
                  >📋 Copy</button>
                </div>
                <pre>{results[activeResult].prompt.substring(0, 300)}...</pre>
              </div>

              {/* All Thumbnails Grid */}
              {results.length > 1 && (
                <div className="result-grid">
                  {results.map((r, i) => (
                    <div
                      key={i}
                      className="image-card"
                      onClick={() => setActiveResult(i)}
                      style={{ border: activeResult === i ? '2px solid var(--primary)' : '1px solid var(--border-color)' }}
                    >
                      <img src={r.imageUrl} alt={`Thumb ${i + 1}`} className="image-card-img" crossOrigin="anonymous" />
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
        <p>
          Built with ❤️ using <a href="https://nextjs.org" target="_blank" rel="noreferrer">Next.js</a> &{' '}
          <a href="https://pollinations.ai" target="_blank" rel="noreferrer">Pollinations AI</a> •{' '}
          <a href="https://github.com/engineermalik2029-alt/thumbnail-generator" target="_blank" rel="noreferrer">Open Source</a>
        </p>
      </footer>

      {/* Toast */}
      <div className={`toast ${toast ? 'visible' : ''}`}>
        {toast}
      </div>
    </div>
  );
}