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
  const cleanSubject = subject || 'a person with an extreme shocked expression';

  const presets: Record<string, { colors: string; lighting: string; style: string }> = {
    harry: {
      colors: 'bold yellow (#FFD700) + deep dark blue (#0a0a2e) + white',
      lighting: 'dramatic studio lighting, strong rim light, high contrast',
      style: 'CodeWithHarry style, dark background, vibrant yellow accents, ultra clean and clickable',
    },
    tech: {
      colors: 'electric blue (#0066ff) + bright orange (#ff6b00) + dark navy',
      lighting: 'cool blue key light with warm orange rim light, futuristic glow',
      style: 'tech YouTube style, blue/orange contrast, glowing futuristic elements, sharp modern look',
    },
    gaming: {
      colors: 'fire red (#ff0033) + bright yellow (#ffd700) + dark charcoal',
      lighting: 'dramatic red and yellow stage lighting, explosive energy, neon glow',
      style: 'gaming YouTube style, red/yellow explosive energy, dynamic high-energy clickable thumbnail',
    },
  };

  const p = presets[preset] || presets.harry;

  return `Create a YouTube thumbnail image. 16:9 aspect ratio, 1280x720, high resolution. Subject: ${cleanSubject} with an extreme, over-the-top facial expression - shocked, screaming, or intense. Face fills about 40% of the frame, positioned center. Background: simple, stylized, slightly blurred dark background relating to "${cleanTopic}". Colors: vibrant, high contrast, using ${p.colors}. Lighting: ${p.lighting}. Style: ${p.style}, digital art, bold black outlines, cell-shaded, pop effect, like a pro YouTube thumbnail. Do NOT include any text, letters, or words in the image. Negative prompts: photorealism, oil painting, watercolor, blurry, low resolution, multiple faces, cluttered, flat lighting.`;
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
    const encodedPrompt = encodeURIComponent(prompt);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&model=flux&nologo=true`;

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
    client.get(url, { timeout: 60000 }, (res) => {
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
