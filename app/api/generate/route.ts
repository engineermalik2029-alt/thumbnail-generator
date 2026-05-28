import { NextResponse } from 'next/server';

/**
 * POST /api/generate
 * Body: { topic: string, imageModel: 'flux' | 'flux-realism' }
 * Returns: { imageUrl: string, prompt: string, topic: string }
 * 
 * Uses Pollinations.AI - completely free, no API key required
 * https://image.pollinations.ai/
 */

function generateThumbnailPrompt(topic: string, style: 'flux' | 'flux-realism'): string {
  const cleanTopic = topic.replace(/["""]/g, '').trim();
  
  // Professional YouTube thumbnail prompts designed to look like top creators
  const prompts: Record<string, string> = {
    'flux': `Professional YouTube thumbnail design for a video titled "${cleanTopic}". 
ULTRA HIGH QUALITY THUMBNAIL DESIGN:
- Bold, eye-catching composition with the main subject prominently featured
- The text "${cleanTopic}" displayed in large, bold, 3D-style typography with drop shadow
- Vibrant color palette: deep reds, bright oranges, electric blues with high contrast
- Dramatic lighting with rim light on subject, cinematic shadows
- Sharp focus, 4K resolution, hyper-detailed textures
- Modern YouTube style: clickable, engaging, professional thumbnail aesthetics
- Glowing effects, depth of field, premium graphic design quality
- The thumbnail MUST contain the main keyword "${cleanTopic}" as bold text overlay
- Background with gradient lighting and subtle patterns
- Style: MrBeast meets cinematic poster design — high energy, bold colors, professional finish`,

    'flux-realism': `Photorealistic YouTube thumbnail for "${cleanTopic}".
CINEMATIC REALISTIC THUMBNAIL DESIGN:
- Photorealistic main subject with dramatic facial expressions or action
- The title "${cleanTopic}" overlaid in bold sans-serif font, white with black stroke
- Studio-quality lighting: key light, fill light, rim light setup
- Shallow depth of field (f/1.8) with bokeh background
- Realistic textures, skin details, environmental lighting
- Colors: warm skin tones, cool background contrast (orange & teal grading)
- Text "${cleanTopic}" appears as YouTube-style bold caption at bottom or top
- 8K photorealism, ultra-detailed, professional photography quality
- Emotionally engaging composition that makes viewers want to click
- Premium film-grade color grading with subtle vignette
- Style: like top tech/educational YouTubers — clean, professional, trustworthy`
  };

  return prompts[style] || prompts['flux'];
}

export async function POST(request: Request) {
  try {
    const { topic, imageModel } = await request.json();
    if (!topic || !imageModel) {
      return NextResponse.json({ error: 'Missing topic or imageModel' }, { status: 400 });
    }

    // Map legacy model names to Pollinations models
    const modelMap: Record<string, 'flux' | 'flux-realism'> = {
      'dalle3': 'flux',
      'stable-diffusion': 'flux-realism',
      'flux': 'flux',
      'flux-realism': 'flux-realism'
    };

    const model = modelMap[imageModel] || 'flux';
    const prompt = generateThumbnailPrompt(topic, model);

    // Pollinations.AI parameters for best quality
    const width = 1920;
    const height = 1080;
    const seed = Math.floor(Math.random() * 99999);
    const encodedPrompt = encodeURIComponent(prompt);

    // Build the Pollinations URL with enhanced quality parameters
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=true&enhance=true`;

    return NextResponse.json({
      imageUrl,
      prompt: prompt.substring(0, 600),
      topic: topic.trim(),
    });
  } catch (err: any) {
    console.error('Error in /api/generate:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}