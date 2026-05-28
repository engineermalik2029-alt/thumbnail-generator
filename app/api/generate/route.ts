import { NextResponse } from 'next/server';

/**
 * Generates a background scene prompt based on topic
 * The AI generates the visual background only (no text)
 * We overlay the text on the frontend for professional results
 */
function generateBackgroundPrompt(topic: string, model: string, variant: number): string {
  const cleanTopic = topic.replace(/["""]/g, '').trim();

  const backgrounds: Record<string, string[]> = {
    'flux': [
      `Dynamic dramatic scene relating to "${cleanTopic}". High contrast lighting, cinematic composition, bold colors (orange, teal, red, blue), intense atmosphere. Perfect YouTube thumbnail background. No text. 4K. --no text, no words, no letters`,
      `Epic cinematic background for topic "${cleanTopic}". Vibrant gradients, dramatic shadows, rim lighting. Color palette: electric blue and warm orange. Photography style background, blurred depth of field. Clean background for text overlay. No text.`,
      `Stunning abstract dramatic background associated with "${cleanTopic}". Rich textures, gradient lighting, professional color grading. Modern design style. Deep colors with bright highlights. Clean empty space for title text. No text or letters.`
    ],
    'flux-realism': [
      `Photorealistic scene related to "${cleanTopic}". Realistic lighting, detailed textures, natural environment. Professional photography quality. Shallow depth of field, bokeh background. Warm cinematic tones. Clean background with space for title text overlay. No text.`,
      `Realistic professional photograph representing "${cleanTopic}". Natural lighting, authentic details, documentary style. 8K quality. Space for text overlay on top or bottom. Moody atmospheric lighting. No text or typography.`,
      `Cinematic realistic scene for "${cleanTopic}". Film-style lighting, volumetric rays, lens flare. Professional color grading (teal/orange). Clean composition with negative space for title. No text or letters.`
    ],
    'flux-anime': [
      `Anime style background for "${cleanTopic}". Studio Ghibli inspired, vibrant sunset colors, magical atmosphere. Cel-shaded, beautiful clouds, glowing particles. Empty space for text overlay. No text.`,
      `Manga style dramatic scene for "${cleanTopic}". Bold colors, dynamic composition, speed lines effect. Vibrant neon and pastel palette. Clean area for title text. No text or words.`
    ]
  };

  const modelKey = backgrounds[model] ? model : 'flux';
  const idx = variant % backgrounds[modelKey].length;
  return backgrounds[modelKey][idx];
}

export async function POST(request: Request) {
  try {
    const { topic, imageModel, variant = 0 } = await request.json();
    if (!topic) {
      return NextResponse.json({ error: 'Missing topic' }, { status: 400 });
    }

    const model = imageModel || 'flux';
    const prompt = generateBackgroundPrompt(topic, model, variant);
    const seed = Math.floor(Math.random() * 99999) + variant * 1000;
    
    // Generate background image (1920x1080 for YouTube thumbnail)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1920&height=1080&seed=${seed}&model=${model}&nologo=true`;

    return NextResponse.json({
      imageUrl,
      topic: topic.trim(),
      prompt,
    });
  } catch (err: any) {
    console.error('Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}