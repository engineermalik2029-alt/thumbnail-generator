import { NextResponse } from 'next/server';

function generateThumbnailPrompt(topic: string, model: string, variant: number): string {
  const cleanTopic = topic.replace(/["""]/g, '').trim();

  const prompts: Record<string, string[]> = {
    'flux': [
      `Professional YouTube thumbnail for "${cleanTopic}". Thumbnail title text "${cleanTopic}" in huge bold 3D font with red gradient and white stroke. Background: dramatic gradient with intense lighting. Composition: cinematic, dynamic, shallow DOF. Colors: electric blue, deep red, bright orange. Style: modern YouTube clickbait design, premium quality, 4K, hyper-detailed, text overlay bold. ${variant > 0 ? 'Alternative composition with different arrangement.' : ''}`,
      `Pro YouTube thumbnail design featuring "${cleanTopic}". The main title "${cleanTopic}" appears as giant bold yellow text with black outline across the image. Background: orange and teal color scheme with dramatic lighting and particle effects. Style: MrBeast-inspired high-energy thumbnail, ultra bold colors, 4K quality, sharp focus, professional graphic design, text-heavy but readable. ${variant > 0 ? 'Variant with shifted layout.' : ''}`,
      `High-end YouTube thumbnail for the topic "${cleanTopic}". Text "${cleanTopic}" written in thick white font with red shadow, placed at the bottom of the image. Scene: vibrant, colorful background with radial gradient lighting, sparkle effects, and high contrast. Style: click-worthy, premium, 4K ultra HD, professional thumbnail composition, eye-catching colors, glowing elements. ${variant > 0 ? 'Different visual arrangement.' : ''}`
    ],
    'flux-realism': [
      `Photorealistic YouTube thumbnail for "${cleanTopic}". Title text "${cleanTopic}" overlaid in bold white font with black stroke at the top. Photorealistic scene with dramatic studio lighting, shallow depth of field f/1.4, bokeh background. Style: cinematographic, 8K photorealism, professional photography, warm skin tones, orange and teal color grading, moody atmosphere. ${variant > 0 ? 'Alternative photorealistic composition.' : ''}`,
      `Realistic YouTube thumbnail featuring "${cleanTopic}". Text "${cleanTopic}" in clean sans-serif font with subtle drop shadow at the bottom. Scene: natural lighting with cinematic flare, realistic textures, environmental detail, high-end production quality. Style: documentary-style photography, 8K resolution, film grain, professional color correction, emotional composition.`,
      `Cinematic YouTube thumbnail for the topic "${cleanTopic}". Bold title "${cleanTopic}" integrated naturally into the scene with professional typography. Realistic environment with dramatic weather or lighting, volumetric fog, lens flare. Style: Hollywood movie poster quality, 8K photorealism, professional lighting setup, emotional depth, premium feel.`
    ],
    'flux-anime': [
      `Anime-style YouTube thumbnail for "${cleanTopic}". Text "${cleanTopic}" in bold anime-style typography with thick outlines and glow effects. Background: vibrant sunset gradient with starry sky particles, cel-shaded styling. Style: Japanese anime aesthetic, Studio Ghibli-inspired colors, bold line art, vibrant pastel and neon colors, magical atmosphere, 4K quality.`,
      `Manga-inspired YouTube thumbnail for "${cleanTopic}". Title "${cleanTopic}" in dynamic comic-style font with speed lines effect behind it. Composition: action-packed, character-focused, dramatic angles. Style: shonen anime art style, bold cell shading, bright primary colors, impact frames, comic book aesthetic, energetic, 4K.`,
      `Kawaii anime YouTube thumbnail for "${cleanTopic}". Cute text "${cleanTopic}" in rounded playful font with pastel colors and sparkles. Scene: dreamy clouds, rainbow gradient, soft lighting. Style: Studio Ghibli soft aesthetics, pastel color palette, gentle glows, magical girl vibes, 4K, adorable and clickable.`
    ]
  };

  const modelKey = prompts[model] ? model : 'flux';
  const idx = variant % prompts[modelKey].length;
  return prompts[modelKey][idx];
}

export async function POST(request: Request) {
  try {
    const { topic, imageModel, variant = 0 } = await request.json();
    if (!topic) {
      return NextResponse.json({ error: 'Missing topic' }, { status: 400 });
    }

    const model = imageModel || 'flux';
    const prompt = generateThumbnailPrompt(topic, model, variant);
    const seed = Math.floor(Math.random() * 99999) + variant * 1000;
    const width = 1920;
    const height = 1080;

    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=true&enhance=true`;

    return NextResponse.json({ imageUrl, prompt, topic: topic.trim() });
  } catch (err: any) {
    console.error('Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}