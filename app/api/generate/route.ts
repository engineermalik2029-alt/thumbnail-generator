import { NextResponse } from 'next/server';

/**
 * Custom AI-powered thumbnail prompt engineering
 * Generates prompts optimized for HiDream AI model
 * Then overlays text via Canvas in the frontend
 */

const STYLE_PROMPTS: Record<string, string[]> = {
  'flux': [
    'dramatic cinematic scene with neon lights and dark atmosphere, bold colors red and blue, professional photography, shallow depth of field, 4K quality, intricate details, empty space for text',
    'epic composition with dramatic lighting, vibrant orange and teal color scheme, cinematic mood, sharp focus, bokeh background, professional grade, clean area for title overlay',
    'dynamic action scene with intense colors, electric blue and hot pink neon glow, dark background with dramatic rim lighting, cinematic atmosphere, premium quality, space for text',
  ],
  'flux-realism': [
    'photorealistic cinematic scene, natural lighting with volumetric rays, professional color grading, rich textures and details, 8K photorealism, soft atmospheric background, clean composition for text overlay',
    'realistic environment with dramatic natural lighting, golden hour tones, professional photography quality, shallow depth of field, detailed textures, moody atmosphere, space for title text',
    'cinematic realistic scene with film-style lighting, warm tones, professional composition, natural colors, high-end photography aesthetic, clean background area, 8K detail',
  ],
  'flux-anime': [
    'anime style magical scene, vibrant sunset colors with pastel gradients, Studio Ghibli inspired, dreamy atmosphere with glowing particles, beautiful clouds, celestial aesthetic, clean space for text',
    'manga style dramatic scene, bold cel-shaded colors, neon and pastel palette, dynamic composition, magical girl aesthetic, starry sky background, clean area for title overlay',
  ],
};

function generatePrompt(topic: string, model: string, variant: number): string {
  const prompts = STYLE_PROMPTS[model] || STYLE_PROMPTS['flux'];
  const idx = variant % prompts.length;
  const basePrompt = prompts[idx];
  
  // Extract keywords from topic for better relevance
  const keywords = topic.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const words = keywords.split(' ').slice(0, 3).join(' ');
  
  return `${words}, ${basePrompt}, relating to topic: ${topic}`;
}

export async function POST(request: Request) {
  try {
    const { topic, imageModel, variant = 0 } = await request.json();
    if (!topic) {
      return NextResponse.json({ error: 'Missing topic' }, { status: 400 });
    }

    const model = imageModel || 'flux';
    const prompt = generatePrompt(topic, model, variant);
    
    // Try HiDream local AI server first
    const hiDreamUrl = process.env.NEXT_PUBLIC_HIDREAM_URL || 'http://localhost:5000';
    
    try {
      const hiDreamRes = await fetch(`${hiDreamUrl}/generate-thumbnail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          width: 1280,
          height: 720,
        }),
        signal: AbortSignal.timeout(120000), // 2 min timeout
      });

      if (hiDreamRes.ok) {
        const data = await hiDreamRes.json();
        if (data.success && data.image) {
          const imageUrl = `data:image/png;base64,${data.image}`;
          return NextResponse.json({
            imageUrl,
            topic: topic.trim(),
            prompt,
          });
        }
      }
    } catch (hiDreamErr) {
      console.log('HiDream unavailable, using fallback:', (hiDreamErr as Error).message);
    }

    // Fallback: Use gradient data (no AI needed)
    const gradients = [
      { name: 'Neon Sunset', colors: ['#ff0033', '#ff6b00', '#ffd700'], accent: '#ff0033' },
      { name: 'Cyberpunk', colors: ['#0f0c29', '#302b63', '#24243e'], accent: '#00e5ff' },
      { name: 'Royal Amethyst', colors: ['#1a0033', '#4a0072', '#7b1fa2'], accent: '#ce93d8' },
      { name: 'Golden Hour', colors: ['#1a0a00', '#cc6600', '#ffaa00'], accent: '#ffd700' },
      { name: 'Blood Moon', colors: ['#0d0000', '#2d0000', '#6b0000'], accent: '#ff1744' },
      { name: 'Aurora', colors: ['#000a1a', '#003300', '#006666'], accent: '#00ff88' },
    ];
    
    const styleMap: Record<string, number[]> = {
      'flux': [0, 1, 2],
      'flux-realism': [3, 4],
      'flux-anime': [5, 1, 0],
    };
    
    const indices = styleMap[model] || styleMap['flux'];
    const gradientIdx = indices[variant % indices.length];
    const gradient = gradients[gradientIdx];

    return NextResponse.json({
      gradient,
      topic: topic.trim(),
      prompt,
    });
    
  } catch (err: any) {
    console.error('Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}