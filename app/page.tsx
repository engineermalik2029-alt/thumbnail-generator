'use client';

import { useState } from 'react';

interface GenerateResponse {
  imageUrl: string;
  prompt: string;
  topic: string;
  error?: string;
}

export default function Home() {
  const [topic, setTopic] = useState('');
  const [model, setModel] = useState<'flux' | 'flux-realism'>('flux');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2000);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), imageModel: model }),
      });
      const data = (await res.json()) as GenerateResponse;
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setResult(data);
    } catch (e: any) {
      setResult({ imageUrl: '', prompt: '', topic: '', error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (result?.prompt) {
      await navigator.clipboard.writeText(result.prompt);
      showToast('Prompt copied!');
    }
  };

  const handleDownload = async () => {
    if (!result?.imageUrl) return;
    try {
      const response = await fetch(result.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${topic.replace(/\s+/g, '_').toLowerCase()}_thumbnail.jpg`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      showToast('Download started!');
    } catch (e) {
      window.open(result.imageUrl, '_blank');
      showToast('Open in new tab. Right-click to save.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && topic.trim()) {
      handleGenerate();
    }
  };

  return (
    <>
      <div className="header">
        <div className="header-badge">
          <span className="dot" />
          AI-Powered
        </div>
        <h1 className="header-title">Thumbnail Generator</h1>
        <p className="header-subtitle">
          Professional YouTube thumbnails designed by AI — with bold text overlays, cinematic lighting, and click-worthy compositions
        </p>
      </div>

      <div className="card">
        <div className="form-group">
          <label className="form-label">Video Topic</label>
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
          <label className="form-label">Style</label>
          <div className="select-wrapper">
            <span className="input-icon">🎨</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as any)}
              className="select-field"
            >
              <option value="flux">🎨 Creative & Bold — Colorful, dramatic, eye-catching (best for most thumbnails)</option>
              <option value="flux-realism">📸 Photorealistic — Realistic scenes, cinematic lighting, professional look</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          className="btn btn-primary"
        >
          {loading ? (
            <>
              <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              Generating Professional Thumbnail...
            </>
          ) : (
            <>
              <span>✨</span>
              Generate Professional Thumbnail
            </>
          )}
        </button>

        {loading && (
          <div className="loading-container">
            <div className="loading-text">🎨 Designing your thumbnail with topic text & professional effects...</div>
            <div className="loading-bar-container">
              <div className="loading-bar" />
            </div>
          </div>
        )}

        {result && result.imageUrl && (
          <div className="result-section">
            <p className="result-label">🎯 Generated Thumbnail</p>

            <div className="image-container">
              <img
                src={result.imageUrl}
                alt={`Thumbnail for ${result.topic || topic}`}
                crossOrigin="anonymous"
              />
              <div className="image-overlay">
                <span className="image-overlay-text">
                  {model === 'flux' ? '🎨 Creative Style' : '📸 Photorealistic'}
                </span>
              </div>
            </div>

            <div className="btn-group">
              <button onClick={handleDownload} className="btn btn-success">
                ⬇ Download Thumbnail
              </button>
              <button onClick={handleGenerate} className="btn btn-secondary">
                🔄 Regenerate
              </button>
              <button onClick={handleCopyPrompt} className="btn btn-secondary">
                📋 Copy Prompt
              </button>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <p className="result-label">🤖 AI Prompt Used</p>
              <div className="prompt-box">
                <pre>{result.prompt}</pre>
                <button onClick={handleCopyPrompt} className="prompt-copy-btn">📋 Copy</button>
              </div>
            </div>
          </div>
        )}

        {result?.error && (
          <div className="error-display">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{result.error}</span>
          </div>
        )}
      </div>

      <div className={`toast ${toastMessage ? 'visible' : ''}`}>
        {toastMessage || ''}
      </div>
    </>
  );
}