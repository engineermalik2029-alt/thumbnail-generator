import { NextResponse } from 'next/server';

/**
 * POST /api/generate
 * Body: { topic: string, imageModel: 'dalle3' | 'stable-diffusion' }
 * Returns: { imageUrl: string, prompt: string }
 * 
 * Uses Pollinations.AI - completely free, no API key required
 * https://image.pollinations.ai/
 */

// Prompt templates for generating YouTube thumbnail descriptions
const promptTemplates: Record<string, string> = {
  default: `Create a YouTube thumbnail for a video about: "{topic}".
The thumbnail should be eye-catching with bold colors, high contrast, and include relevant visual elements.
Style: Modern, professional, click-worthy YouTube thumbnail design.
Text overlay suggestion: Include the main keyword in large bold text.
Colors: Use vibrant, contrasting colors that pop.`,
  creative: `Design a stunning YouTube thumbnail for "{topic}".
Make it ultra-creative with: dramatic lighting, depth of field, cinematic composition.
Use warm colors with cool accents. Add emotional impact.
The thumbnail should tell a story at a glance.`,
  minimal: `Create a clean, minimal YouTube thumbnail for "{topic}".
Use a simple background with one focal subject.
Style: Apple-like minimalism, clean lines, lots of negative space.
Colors: Monochromatic with one accent color.`,
};

function generatePrompt(topic: string, style: string = 'default'): string {
  const template = promptTemplates[style] || promptTemplates.default;
  return template.replace(/\{topic\}/g, topic);
}

export async function POST(request: Request) {
  try {
    const { topic, imageModel } = await request.json();
    if (!topic || !imageModel) {
      return NextResponse.json({ error: 'Missing topic or imageModel' }, { status: 400 });
    }

    // Generate a descriptive prompt for the image
    const style = imageModel === 'dalle3' ? 'creative' : 'minimal';
    const prompt = generatePrompt(topic, style);

    // Encode the prompt for URL
    const encodedPrompt = encodeURIComponent(prompt.substring(0, 400));

    // Pollinations.AI parameters
    const width = 1920;
    const height = 1080;
    const seed = Math.floor(Math.random() * 100000);
    const model = imageModel === 'dalle3' ? 'flux' : 'flux-realism';

    // Build the Pollinations URL
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=true`;

    return NextResponse.json({
      imageUrl,
      prompt: prompt.substring(0, 500),
    });
  } catch (err: any) {
    console.error('Error in /api/generate:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}