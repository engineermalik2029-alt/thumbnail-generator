export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '1rem' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 900 }}>404</h1>
      <p style={{ color: 'rgba(255,255,255,0.6)' }}>Page not found</p>
      <a href="/" style={{ color: '#ff0033' }}>Go home</a>
    </div>
  );
}