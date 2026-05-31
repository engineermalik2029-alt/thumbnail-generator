import { NextResponse } from 'next/server';
import https from 'https';
import http from 'http';

/**
 * YouTube Thumbnail Generator using Pollinations API
 * Completely free, no API key required
 * Proxies image through server to avoid CORS issues in browser canvas
 */

function buildThumbnailPrompt(params: {
  topic: string;
  subject: string;
  preset: string;
}): string {
  const { topic, subject, preset } = params;
  const cleanTopic = topic.replace(/["""]/g, '').trim();
  const cleanSubject = subject || 'a young person with extreme shocked expression, jaw dropped, eyes wide open';

  const presets: Record<string, string> = {
    harry: 'professional YouTube thumbnail style, dark navy blue background (#0a0a2e), vibrant gold yellow accents (#FFD700), dramatic studio lighting with strong rim light, high contrast, bold black outlines around subject like a sticker, cell-shaded vector art, ultra clean and clickable design, CodeWithHarry inspired style',
    tech: 'professional tech YouTube thumbnail, dark navy background, electric blue (#0066ff) and bright orange (#ff6b00) color scheme, futuristic glowing elements, circuit board accents, holographic effects, cool blue key light with warm orange rim light, sharp modern digital art style',
    gaming: 'professional gaming YouTube thumbnail, dark charcoal background (#1a1a1a), fire red (#ff0033) and bright yellow (#ffd700) explosive energy, lightning bolts, flame effects, neon glow, dramatic stage lighting, high energy action style, esports quality',
  };

  const p = presets[preset] || presets.harry;

  return `Ultra high quality professional YouTube thumbnail. 16:9 aspect ratio, 1280x720, sharp detailed digital art. Main subject: ${cleanSubject}, face fills 40-50% of frame, positioned slightly off-center for dynamic composition. The subject should have an extremely expressive face - shocked, amazed, or excited. Style: ${p}. Composition: subject in foreground with clean separation from background. The image must look like it would get millions of clicks on YouTube. Absolutely NO text, NO words, NO letters, NO watermarks in the image. Negative: blurry, low quality, photorealistic, oil painting, watermark, multiple faces, cluttered background.`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, subjectDescription, preset = 'harry' } = body;

    if (!topic) {
      return NextResponse.json({ error: 'Video topic is required' }, { status: 400 });
    }

    const prompt = buildThumbnailPrompt({
      topic,
      subject: subjectDescription || '',
      preset,
    });

    const displayText = topic.toUpperCase();

    // Pollinations API - completely free, no API key needed
    const seed = Math.floor(Math.random() * 100000);
    const encodedPrompt = encodeURIComponent(prompt);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&model=flux&nologo=true&enhance=true&seed=${seed}`;

    // Fetch image server-side and convert to base64 data URL to avoid CORS issues
    const imageBase64 = await fetchImageAsBase64(pollinationsUrl);

    return NextResponse.json({
      imageUrl: imageBase64,
      topic: displayText,
      prompt,
      preset,
    });

  } catch (err: any) {
    console.error('Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

function fetchImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { timeout: 120000 }, (res) => {
      // Handle redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchImageAsBase64(res.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || 'image/jpeg';
        const base64 = buffer.toString('base64');
        resolve(`data:${contentType};base64,${base64}`);
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}
