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
  intensity: number;
}): string {
  const { topic, subject, preset, intensity } = params;
  const cleanTopic = topic.replace(/["""]/g, '').trim();
  const cleanSubject = subject || 'a young person with extreme shocked expression, jaw dropped, eyes wide open';

  // Topic-specific visual elements based on keyword detection
  const topicLower = cleanTopic.toLowerCase();
  let topicVisual = '';
  if (topicLower.includes('python') || topicLower.includes('coding') || topicLower.includes('programming') || topicLower.includes('javascript') || topicLower.includes('react') || topicLower.includes('web')) {
    topicVisual = 'laptop with glowing code on screen, floating code snippets, binary rain, neon green and blue code elements, programming workspace';
  } else if (topicLower.includes('gaming') || topicLower.includes('game') || topicLower.includes('fortnite') || topicLower.includes('valorant')) {
    topicVisual = 'gaming controller, RGB lighting, gaming headset, esports arena lights, gaming PC setup';
  } else if (topicLower.includes('ai') || topicLower.includes('artificial intelligence') || topicLower.includes('machine learning') || topicLower.includes('chatgpt')) {
    topicVisual = 'robot brain, neural network visualization, futuristic AI interface, glowing circuits, holographic display';
  } else if (topicLower.includes('music') || topicLower.includes('song') || topicLower.includes('singing')) {
    topicVisual = 'musical notes floating, microphone, sound waves, concert lights, speaker cones';
  } else if (topicLower.includes('food') || topicLower.includes('cooking') || topicLower.includes('recipe')) {
    topicVisual = 'steaming plate of food, kitchen flames, cooking utensils, colorful ingredients';
  } else if (topicLower.includes('fitness') || topicLower.includes('workout') || topicLower.includes('gym')) {
    topicVisual = 'dumbbells, muscle definition, gym equipment, sweat drops, power pose';
  } else if (topicLower.includes('travel') || topicLower.includes('vlog')) {
    topicVisual = 'world landmarks silhouette, airplane trail, passport stamps, exotic location background';
  } else if (topicLower.includes('money') || topicLower.includes('finance') || topicLower.includes('invest') || topicLower.includes('crypto')) {
    topicVisual = 'floating money bills, gold coins, stock chart going up, dollar signs, luxury items';
  } else {
    topicVisual = `visual elements related to ${cleanTopic}, thematic props and symbols`;
  }

  const intensityDesc = intensity >= 80 ? 'EXTREME, MAXIMUM INTENSITY, over-the-top' : intensity >= 50 ? 'HIGH INTENSITY, dramatic' : 'MODERATE, clean';

  const presets: Record<string, string> = {
    harry: `professional YouTube thumbnail style, dark navy blue background (#0a0a2e), vibrant gold yellow accents (#FFD700), dramatic studio lighting with strong rim light, high contrast, bold black outlines around subject like a sticker, cell-shaded vector art, ultra clean and clickable design, CodeWithHarry inspired style. Include topic-related visual elements: ${topicVisual}`,
    tech: `professional tech YouTube thumbnail, dark navy background, electric blue (#0066ff) and bright orange (#ff6b00) color scheme, futuristic glowing elements, holographic effects, cool blue key light with warm orange rim light, sharp modern digital art style. Include topic-related visual elements: ${topicVisual}`,
    gaming: `professional gaming YouTube thumbnail, dark charcoal background (#1a1a1a), fire red (#ff0033) and bright yellow (#ffd700) explosive energy, lightning bolts, flame effects, neon glow, dramatic stage lighting, high energy action style, esports quality. Include topic-related visual elements: ${topicVisual}`,
  };

  const p = presets[preset] || presets.harry;

  return `Ultra high quality professional YouTube thumbnail, ${intensityDesc} energy. 16:9 aspect ratio, 1280x720, sharp detailed digital art. Main subject: ${cleanSubject}, face fills 40-50% of frame, positioned slightly off-center for dynamic composition. The subject MUST have an extremely expressive face reacting to "${cleanTopic}" - shocked, amazed, or excited. Visual elements directly related to "${cleanTopic}": ${topicVisual}. Style: ${p}. Composition: subject in foreground with clean separation from background. Vibrant saturated colors that pop. The image must look like it would get millions of clicks on YouTube. Absolutely NO text, NO words, NO letters, NO watermarks in the image. Negative: blurry, low quality, photorealistic, oil painting, watermark, multiple faces, cluttered background, dull colors.`;
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

    // Pollinations API - use turbo model for highest quality output
    const seed = Math.floor(Math.random() * 100000);
    const encodedPrompt = encodeURIComponent(prompt);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1920&height=1080&model=turbo&nologo=true&enhance=true&seed=${seed}`;

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
