import './globals.css';

export const metadata = {
  title: 'YouTube Thumbnail Generator',
  description: 'Generate AI-powered YouTube thumbnails with DALL·E 3 and Stable Diffusion',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="background-container">
          <div className="background-gradient bg-gradient-1" />
          <div className="background-gradient bg-gradient-2" />
          <div className="background-gradient bg-gradient-3" />
          <div className="bg-grid" />
        </div>
        <div className="main-container">
          {children}
        </div>
      </body>
    </html>
  );
}