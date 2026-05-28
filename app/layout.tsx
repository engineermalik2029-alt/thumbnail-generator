import './globals.css';

export const metadata = {
  title: 'ThumbnailForge — AI YouTube Thumbnail Generator',
  description: 'Create professional, click-worthy YouTube thumbnails with AI. Free, no signup, instant generation. Used by content creators worldwide.',
  keywords: 'thumbnail generator, youtube thumbnail, ai thumbnail, thumbnail maker, free thumbnail creator',
  openGraph: {
    title: 'ThumbnailForge — AI YouTube Thumbnail Generator',
    description: 'Create professional, click-worthy YouTube thumbnails with AI. Free, no signup required.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="bg-container">
          <div className="bg-orb bg-orb-1" />
          <div className="bg-orb bg-orb-2" />
          <div className="bg-orb bg-orb-3" />
          <div className="bg-grid" />
        </div>
        {children}
      </body>
    </html>
  );
}