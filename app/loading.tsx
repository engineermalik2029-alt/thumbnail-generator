export default function Loading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '1rem' }}>
      <div style={{
        width: 48,
        height: 48,
        border: '3px solid rgba(255,255,255,0.06)',
        borderTopColor: '#ff0033',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading ThumbnailForge...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}