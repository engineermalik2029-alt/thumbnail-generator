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
  aspectRatio: string;
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

  const ratioHint = params.aspectRatio === 'ig_square' ? 'SQUARE 1:1 composition, perfectly centered' :
    params.aspectRatio?.includes('ig_story') || params.aspectRatio?.includes('tiktok') || params.aspectRatio?.includes('whatsapp') || params.aspectRatio?.includes('snapchat') || params.aspectRatio?.includes('shorts') ? 'PORTRAIT 9:16 vertical composition, full-body or waist-up framing' :
    params.aspectRatio === 'linkedin' ? 'EXTREME WIDE 4:1 banner composition, ultra wide landscape' :
    params.aspectRatio === 'ultra_wide' ? 'ULTRA WIDE 21:9 cinematic composition, very wide panoramic' :
    params.aspectRatio === 'cinema' ? 'CINEMATIC 2.39:1 anamorphic wide composition' :
    params.aspectRatio === 'banner' ? 'WIDE BANNER 3:1 composition, wide horizontal layout' :
    params.aspectRatio === 'facebook' ? 'WIDE 1.91:1 composition, slightly wider than 16:9' :
    params.aspectRatio === 'pinterest' ? 'TALL PORTRAIT 2:3 pin-style composition, elegant vertical' :
    '16:9 landscape widescreen composition';
  return `${cleanSubject}, extremely expressive face reacting to ${cleanTopic}, shocked amazed excited, face fills 40-50 percent of frame, centered. Background elements: ${topicVisual}. ${intensityDesc} energy. Style: ${p}. Sharp focus, vibrant saturated colors, clean composition, professional thumbnail, ${ratioHint}. No text no words no letters no watermarks.`;
}

// Available Gemini models (tried in order)
// User's models: gemini-2.0-flash, gemini-2.0-flash-lite, gemini-2.0-flash-thinking-exp, gemini-embedding
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-thinking-exp',
];

// Use Gemini as a prompt enhancer — creates detailed, topic-specific descriptions
async function enhancePromptWithGemini(prompt: string, apiKey: string): Promise<string> {
  const enhancerPrompt = `You are a YouTube thumbnail expert. Given this basic description: "${prompt}"
  
Create a detailed, vivid image generation prompt (200 words max) for a professional YouTube thumbnail. The prompt should describe:
1. A specific person with a clear, exaggerated facial expression (shocked, amazed, excited)
2. Their exact clothing, hair, and posture
3. Background elements that directly relate to the topic
4. Lighting, colors, and style that would get millions of clicks
5. NO text, NO words, NO letters in the image

Output ONLY the prompt description, nothing else. Max 200 words.`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: enhancerPrompt }] }],
    generationConfig: {
      maxOutputTokens: 500,
      temperature: 0.8,
    },
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000,
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
          const candidates = json.candidates || [];
          for (const candidate of candidates) {
            const parts = candidate.content?.parts || [];
            for (const part of parts) {
              if (part.text) {
                resolve(part.text.trim());
                return;
              }
            }
          }
          reject(new Error('No text in Gemini response'));
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
async function generateWithPollinations(prompt: string, width: number = 1920, height: number = 1080): Promise<string> {
  const seed = Math.floor(Math.random() * 100000);
  const encodedPrompt = encodeURIComponent(prompt + ' ultra quality, 8K, super detailed, professional');
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=flux-realism&nologo=true&enhance=true&seed=${seed}`;
  return fetchImageAsBase64(url);
}

// Aspect ratio definitions with exact dimensions
export const ASPECT_RATIOS = {
  yt: { label: 'YouTube Thumbnail 16:9', w: 1280, h: 720 },
  ig_square: { label: 'Instagram Square 1:1', w: 1080, h: 1080 },
  ig_story: { label: 'Instagram Story 9:16', w: 1080, h: 1920 },
  tiktok: { label: 'TikTok/Shorts 9:16', w: 1080, h: 1920 },
  twitter_card: { label: 'Twitter Card 16:9', w: 1280, h: 720 },
  facebook: { label: 'Facebook 1.91:1', w: 1200, h: 630 },
  linkedin: { label: 'LinkedIn Banner 4:1', w: 1584, h: 396 },
  pinterest: { label: 'Pinterest Pin 2:3', w: 1000, h: 1500 },
  whatsapp: { label: 'WhatsApp Status 9:16', w: 1080, h: 1920 },
  snapchat: { label: 'Snapchat 9:16', w: 1080, h: 1920 },
  yt_shorts: { label: 'YouTube Shorts 9:16', w: 1080, h: 1920 },
  twitter_post: { label: 'Twitter Post 16:9', w: 1280, h: 720 },
  ultra_wide: { label: 'ULTRA WIDE 21:9', w: 2560, h: 1080 },
  cinema: { label: 'CINEMA 2.39:1', w: 2560, h: 1072 },
  banner: { label: 'BANNER 3:1', w: 1920, h: 640 },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, subjectDescription, preset = 'harry', intensity = 85, geminiApiKey = '', aspectRatio = 'yt', customWidth, customHeight } = body;
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
      aspectRatio,
    });

    const displayText = topic.toUpperCase();

    // Determine final dimensions
    let finalWidth = 1280;
    let finalHeight = 720;
    if (aspectRatio === 'custom' && customWidth && customHeight) {
      finalWidth = Math.min(2560, Math.max(100, customWidth));
      finalHeight = Math.min(2560, Math.max(100, customHeight));
    } else if (ASPECT_RATIOS[aspectRatio as keyof typeof ASPECT_RATIOS]) {
      finalWidth = ASPECT_RATIOS[aspectRatio as keyof typeof ASPECT_RATIOS].w;
      finalHeight = ASPECT_RATIOS[aspectRatio as keyof typeof ASPECT_RATIOS].h;
    }

    let imageBase64: string;
    let provider: string;

    let finalPrompt = prompt;
    let providerSuffix = '';

    // Use Gemini as prompt enhancer if key provided
    if (effectiveApiKey && effectiveApiKey.trim().length > 10 && !effectiveApiKey.includes('PASTE_YOUR')) {
      try {
        finalPrompt = await enhancePromptWithGemini(prompt, effectiveApiKey.trim());
        providerSuffix = '+Gemini';
      } catch (geminiErr: any) {
        console.warn('Gemini prompt enhancement failed:', geminiErr.message);
        providerSuffix = ' (Gemini unavailable)';
      }
    }

    // Smart upscaling: cap at 2048 on either side
    let apiWidth = finalWidth;
    let apiHeight = finalHeight;
    if (finalWidth > 2048 || finalHeight > 2048) {
      const scale = Math.min(2048 / finalWidth, 2048 / finalHeight);
      apiWidth = Math.floor(finalWidth * scale);
      apiHeight = Math.floor(finalHeight * scale);
    }

    imageBase64 = await generateWithPollinations(finalPrompt, apiWidth, apiHeight);
    provider = 'Pollinations' + providerSuffix;

    return NextResponse.json({
      imageUrl: imageBase64,
      topic: displayText,
      prompt,
      preset,
      provider,
      dimensions: { width: finalWidth, height: finalHeight },
      upscaled: apiWidth !== finalWidth || apiHeight !== finalHeight,
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