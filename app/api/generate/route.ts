import { NextResponse } from 'next/server';

/**
 * Professional Cinematic Thumbnail Generator
 * Uses HiDream AI with expert-level prompt engineering
 */

interface GenerateRequest {
  topic: string;
  subjectDescription: string;
  overlayText: string;
  imageModel: string;
  variant: number;
}

/**
 * Builds a hyper-realistic cinematic prompt following professional template
 */
function buildCinematicPrompt(params: {
  topic: string;
  subject: string;
  model: string;
  variant: number;
}): string {
  const { topic, subject, model } = params;

  // Style-specific color palettes and lighting
  const styles: Record<string, {
    colors: string;
    lighting: string;
    background: string;
    vibe: string;
  }> = {
    'flux': {
      colors: 'deep red (#ff0033) + electric yellow (#ffd700) + dark blue (#0a0a2e)',
      lighting: 'dramatic top-left key light, intense rim light on edges, cinematic shadows, volumetric lighting rays',
      background: 'dark atmospheric studio with neon accents, slightly blurred depth of field, futuristic subtle grid pattern',
      vibe: 'high-energy, bold, intense, click-worthy, MrBeast-style drama',
    },
    'flux-realism': {
      colors: 'warm amber (#ff8c00) + teal (#008080) + deep navy (#0a1628)',
      lighting: 'cinematic golden hour key light from side, soft rim light, natural fill, subtle lens flare',
      background: 'professional studio environment with controlled lighting, shallow depth of field, premium atmosphere',
      vibe: 'premium, sophisticated, professional documentary style, cinematic realism',
    },
    'flux-anime': {
      colors: 'vibrant magenta (#ff006e) + cyan (#00e5ff) + pastel lavender (#b388ff)',
      lighting: 'dramatic anime-style rim lighting, soft cel-shaded glow, magical particle lighting',
      background: 'stylized anime environment with bokeh effects, dreamy atmospheric depth, vibrant gradients',
      vibe: 'anime cinematic, Studio Ghibli meets modern shonen, vibrant magical aesthetic',
    },
  };

  const s = styles[model] || styles['flux'];
  const cleanTopic = topic.replace(/["""]/g, '').trim();
  const cleanSubject = subject || 'a person with high-energy expression';

  // The professional prompt template
  return `Generate a hyper-realistic, cinematic YouTube thumbnail in 16:9 aspect ratio (1280x720 pixels), 8K resolution, ultra-detailed, sharp focus.

Subject & Composition:
- Main subject is ${cleanSubject} in a medium shot with an expressive, high-energy emotion (shocked, excited, intense focus).
- Subject is positioned center with the face taking up ~40% of the frame.
- Background is slightly blurred (shallow depth of field) but adds context relating to: "${cleanTopic}".
- ${s.background}

Lighting & Color:
- Cinematic lighting: ${s.lighting}.
- High contrast, vibrant but not oversaturated.
- Color palette: ${s.colors}.
- Use glow effects sparingly around focal points.

Text Overlay (if any):
- Text: "${cleanTopic.toUpperCase()}" in bold, sans-serif font (Arial Black/Impact), white with thick black outline and drop shadow.
- Placed in bottom third, large enough to read on mobile.

Style keywords:
${s.vibe}, 8K, cinematic, hyper-detailed, professional thumbnail, dramatic lighting, rim light, volumetric lighting, sharp focus, shallow depth of field, vibrant, pop effect, dark background, subject stands out.

Negative prompts (avoid):
blurry, pixelated, low resolution, washed out, flat lighting, cartoon, anime, watercolor, sketch, black and white, cluttered background, too many elements, distorted face, unnatural anatomy, cheap stock photo look, watermarks, logos, text in background, overexposed, dark and underexposed, extra text, spelling errors, typos.`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as GenerateRequest;
    const { topic, subjectDescription, overlayText, imageModel, variant = 0 } = body;

    if (!topic) {
      return NextResponse.json({ error: 'Video topic is required' }, { status: 400 });
    }

    const model = imageModel || 'flux';
    const prompt = buildCinematicPrompt({
      topic,
      subject: subjectDescription || '',
      model,
      variant,
    });

    // Determine overlay text: use user's custom text or the topic
    const displayText = overlayText || topic;

    // Try HiDream local AI server
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
        signal: AbortSignal.timeout(180000), // 3 min timeout
      });

      if (hiDreamRes.ok) {
        const data = await hiDreamRes.json();
        if (data.success && data.image) {
          const imageUrl = `data:image/png;base64,${data.image}`;
          return NextResponse.json({
            imageUrl,
            topic: displayText,
            prompt,
          });
        }
      }
    } catch (hiDreamErr) {
      console.log('HiDream unavailable, using gradient fallback');
    }

    // Fallback: return gradient info + the prompt
    const gradients = [
      { name: 'Cinematic Red', colors: ['#0a0000', '#4a0000', '#ff0033'], accent: '#ff0033' },
      { name: 'Cyberpunk Neon', colors: ['#0a0a2e', '#1a1a4e', '#ff006e'], accent: '#00e5ff' },
      { name: 'Golden Hour', colors: ['#1a0a00', '#8b4513', '#ffaa00'], accent: '#ffd700' },
      { name: 'Royal Crimson', colors: ['#1a0005', '#3a0010', '#8b0000'], accent: '#ff1744' },
      { name: 'Ocean Depths', colors: ['#000a1a', '#001a3a', '#003366'], accent: '#00bfff' },
      { name: 'Mystic Violet', colors: ['#0a001a', '#2a0040', '#7b1fa2'], accent: '#ce93d8' },
    ];

    const indices: Record<string, number[]> = {
      'flux': [0, 1, 4],
      'flux-realism': [2, 3, 5],
      'flux-anime': [5, 1, 0],
    };
    const idx = (indices[model] || indices['flux'])[variant % 3];
    const gradient = gradients[idx];

    return NextResponse.json({
      gradient,
      topic: displayText,
      prompt,
    });

  } catch (err: any) {
    console.error('Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}