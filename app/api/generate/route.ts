import { NextResponse } from 'next/server';
import https from 'https';
import http from 'http';

/**
 * YouTube Thumbnail Generator using Pollinations API
 * Uses flux-realism model for clearest, most detailed images
 * Proxies image through server to avoid CORS issues
 */

function buildThumbnailPrompt(params: {
  topic: string;
  subject: string;
  preset: string;
  intensity: number;
}): string {
  const { topic, subject, preset, intensity } = params;
  const cleanTopic = topic.replace(/["""]/g, '').trim();
  const cleanSubject = subject || 'a young person with extreme shocked expression, jaw dropped, eyes wide open';

  // Topic-specific visual elements
  const topicLower = cleanTopic.toLowerCase();
  let topicVisual = '';
  if (topicLower.includes('python') || topicLower.includes('coding') || topicLower.includes('programming') || topicLower.includes('javascript') || topicLower.includes('react') || topicLower.includes('web')) {
    topicVisual = 'laptop with glowing code, floating code snippets, programming workspace';
  } else if (topicLower.includes('gaming') || topicLower.includes('game') || topicLower.includes('fortnite') || topicLower.includes('valorant')) {
    topicVisual = 'gaming controller, RGB lighting, gaming headset, esports arena lights';
  } else if (topicLower.includes('ai') || topicLower.includes('artificial intelligence') || topicLower.includes('machine learning') || topicLower.includes('chatgpt')) {
    topicVisual = 'robot brain, neural network visualization, futuristic AI interface, glowing circuits';
  } else if (topicLower.includes('music') || topicLower.includes('song') || topicLower.includes('singing')) {
    topicVisual = 'musical notes floating, microphone, sound waves, concert lights';
  } else if (topicLower.includes('food') || topicLower.includes('cooking') || topicLower.includes('recipe')) {
    topicVisual = 'steaming plate of food, kitchen flames, colorful ingredients';
  } else if (topicLower.includes('fitness') || topicLower.includes('workout') || topicLower.includes('gym')) {
    topicVisual = 'dumbbells, muscle definition, gym equipment, power pose';
  } else if (topicLower.includes('travel') || topicLower.includes('vlog')) {
    topicVisual = 'world landmarks, airplane trail, exotic location background';
  } else if (topicLower.includes('money') || topicLower.includes('finance') || topicLower.includes('invest') || topicLower.includes('crypto')) {
    topicVisual = 'floating money bills, gold coins, stock chart going up, luxury items';
  } else {
    topicVisual = `visual elements related to ${cleanTopic}, thematic props`;
  }

  const intensityDesc = intensity >= 80 ? 'EXTREME over-the-top' : intensity >= 50 ? 'HIGH dramatic' : 'MODERATE clean';

  const presets: Record<string, string> = {
    harry: 'dark navy blue background, vibrant gold yellow accents, dramatic studio lighting, high contrast, bold black outlines, cell-shaded vector art, ultra clean clickable design',
    tech: 'dark navy background, electric blue and bright orange color scheme, futuristic glowing elements, holographic effects, sharp modern digital art',
    gaming: 'dark charcoal background, fire red and bright yellow explosive energy, lightning bolts, flame effects, neon glow, esports quality',
  };

  const p = presets[preset] || presets.harry;

  return `${cleanSubject}, extremely expressive face reacting to ${cleanTopic}, shocked amazed excited, face fills 40-50 percent of frame, centered. Background elements: ${topicVisual}. ${intensityDesc} energy. Style: ${p}. Sharp focus, vibrant saturated colors, clean composition, professional youtube thumbnail, 16:9 ratio. No text no words no letters no watermarks.`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, subjectDescription, preset = 'harry', intensity = 85 } = body;

    if (!topic) {
      return NextResponse.json({ error: 'Video topic is required' }, { status: 400 });
    }

    const prompt = buildThumbnailPrompt({
      topic,
      subject: subjectDescription || '',
      preset,
      intensity,
    });

    const displayText = topic.toUpperCase();

    // Pollinations API - flux-realism for clearest images
    const seed = Math.floor(Math.random() * 100000);
    const encodedPrompt = encodeURIComponent(prompt);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1920&height=1080&model=flux-realism&nologo=true&enhance=true&seed=${seed}`;

    // Fetch image server-side and convert to base64 to avoid CORS
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