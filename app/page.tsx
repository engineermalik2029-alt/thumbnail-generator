'use client';

import { useState } from 'react';

interface GenerateResponse {
  imageUrl: string;
  prompt: string;
  error?: string;
}

export default function Home() {
  const [topic, setTopic] = useState('');
  const [model, setModel] = useState<'dalle3' | 'stable-diffusion'>('dalle3');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

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
      setResult({ imageUrl: '', prompt: '', error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (result?.prompt) {
      await navigator.clipboard.writeText(result.prompt);
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2000);
    }
  };

  const handleDownload = () => {
    if (result?.imageUrl) {
      const link = document.createElement('a');
      link.href = result.imageUrl;
      link.download = `${topic.replace(/\s+/g, '_')}_thumbnail.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && topic.trim()) {
      handleGenerate();
    }
  };

  return (
    <>
      {/* Header */}
      <div className="header">
        <div className="header-badge">
          <span className="dot" />
          AI-Powered
        </div>
        <h1 className="header-title">
          Thumbnail Generator
        </h1>
        <p className="header-subtitle">
          Create stunning YouTube thumbnails with AI — powered by DALL·E 3 and Stable Diffusion
        </p>
      </div>

      {/* Main Card */}
      <div className="card">
        {/* Topic Input */}
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

        {/* Model Select */}
        <div className="form-group">
          <label className="form-label">AI Model</label>
          <div className="select-wrapper">
            <span className="input-icon">🤖</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as any)}
              className="select-field"
            >
              <option value="dalle3">
                🎨 DALL·E 3 — Best for creative & detailed designs
              </option>
              <option value="stable-diffusion">
                ⚡ Stable Diffusion XL — Fast & realistic renders
              </option>
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          className="btn btn-primary"
        >
          {loading ? (
            <>
              <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              Generating...
            </>
          ) : (
            <>
              <span>✨</span>
              Generate Thumbnail
            </>
          )}
        </button>

        {/* Loading State */}
        {loading && (
          <div className="loading-container">
            <div className="loading-text">Crafting your thumbnail with AI...</div>
            <div className="loading-bar-container">
              <div className="loading-bar" />
            </div>
          </div>
        )}

        {/* Result */}
        {result && result.imageUrl && (
          <div className="result-section">
            <p className="result-label">Generated Thumbnail</p>

            {/* Image */}
            <div className="image-container">
              <img
                src={result.imageUrl}
                alt="Generated thumbnail"
              />
              <div className="image-overlay">
                <span className="image-overlay-text">
                  {model === 'dalle3' ? '🎨 DALL·E 3' : '⚡ Stable Diffusion XL'}
                </span>
              </div>
            </div>

            {/* Prompt */}
            <div style={{ marginTop: '1rem' }}>
              <p className="result-label">Generation Prompt</p>
              <div className="prompt-box">
                <pre>{result.prompt}</pre>
                <button onClick={handleCopy} className="prompt-copy-btn">
                  📋 Copy
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="btn-group">
              <button onClick={handleDownload} className="btn btn-success">
                ⬇ Download
              </button>
              <button onClick={handleGenerate} className="btn btn-secondary">
                🔄 Regenerate
              </button>
              <button onClick={handleCopy} className="btn btn-secondary">
                📋 Copy Prompt
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {result?.error && (
          <div className="error-display">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{result.error}</span>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      <div className={`toast ${toastVisible ? 'visible' : ''}`}>
        ✓ Copied to clipboard
      </div>
    </>
  );
}