'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '1rem', padding: '2rem' }}>
      <span style={{ fontSize: '3rem' }}>⚠️</span>
      <h1 style={{ fontSize: '2rem', fontWeight: 900 }}>Something went wrong</h1>
      <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: 400 }}>
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.75rem 2rem',
          background: 'linear-gradient(135deg, #ff0033, #ff6b00)',
          border: 'none',
          borderRadius: 10,
          color: 'white',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: '1rem',
        }}
      >
        Try again
      </button>
    </div>
  );
}