import { NextResponse } from 'next/server';
import https from 'https';
import http from 'http';

/**
 * YouTube Thumbnail Generator
 * Supports: Google Gemini (with API key) or Pollinations AI (free, no key)
 * Uses gemini-2.5-flash-image or gemini-2.0-flash-exp-image-generation model
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

// Available Gemini models (tried in order)
// User's models: gemini-2.0-flash, gemini-2.0-flash-lite, gemini-2.0-flash-thinking-exp, gemini-embedding
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-thinking-exp',
];

// Generate image using Google Gemini API
async function generateWithGemini(prompt: string, apiKey: string): Promise<string> {
  const geminiPrompt = `Generate a YouTube thumbnail image based on this description: ${prompt}. The image should be 1920x1080, high quality, vibrant colors, professional look, suitable for a YouTube thumbnail.`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: geminiPrompt }] }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  });

  // Try each model in order until one works
  for (const modelName of GEMINI_MODELS) {
    try {
      const result = await tryGeminiModel(modelName, body, apiKey);
      return result;
    } catch (e: any) {
      // If this is not a "model not found" error, it's a real API error
      if (!e.message.includes('not found') && !e.message.includes('not supported')) {
        throw e;
      }
      // Otherwise try next model
    }
  }
  throw new Error('No available Gemini model found for image generation');
}

async function tryGeminiModel(modelName: string, body: string, apiKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 120000,
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error.message || 'Gemini API error'));
            return;
          }
          // Extract image from response
          const candidates = json.candidates || [];
          for (const candidate of candidates) {
            const parts = candidate.content?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                const mimeType = part.inlineData.mimeType || 'image/png';
                resolve(`data:${mimeType};base64,${part.inlineData.data}`);
                return;
              }
            }
          }
          reject(new Error('No image in Gemini response'));
        } catch (e: any) {
          reject(new Error('Failed to parse Gemini response: ' + e.message));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Gemini API timeout')); });
    req.write(body);
    req.end();
  });
}

// Generate image using Pollinations API (free, no key needed)
async function generateWithPollinations(prompt: string): Promise<string> {
  const seed = Math.floor(Math.random() * 100000);
  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1920&height=1080&model=flux-realism&nologo=true&enhance=true&seed=${seed}`;
  return fetchImageAsBase64(url);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, subjectDescription, preset = 'harry', intensity = 85, geminiApiKey = '' } = body;
    // Check environment variable as fallback (set in .env.local or system environment)
    const envApiKey = process.env.GEMINI_API_KEY || '';
    const effectiveApiKey = geminiApiKey || envApiKey;

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

    let imageBase64: string;
    let provider: string;

    // Use Gemini if real API key provided, otherwise use Pollinations (free)
    if (effectiveApiKey && effectiveApiKey.trim().length > 10 && !effectiveApiKey.includes('PASTE_YOUR')) {
      try {
        imageBase64 = await generateWithGemini(prompt, effectiveApiKey.trim());
        provider = 'gemini';
      } catch (geminiErr: any) {
        console.warn('Gemini failed, falling back to Pollinations:', geminiErr.message);
        imageBase64 = await generateWithPollinations(prompt);
        provider = 'pollinations (Gemini unavailable: ' + geminiErr.message + ')';
      }
    } else {
      imageBase64 = await generateWithPollinations(prompt);
      provider = 'pollinations';
    }

    return NextResponse.json({
      imageUrl: imageBase64,
      topic: displayText,
      prompt,
      preset,
      provider,
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