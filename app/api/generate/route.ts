import { NextResponse } from 'next/server';

interface GenerateRequest {
  topic: string;
  subjectDescription: string;
  overlayText: string;
  imageModel: string;
  preset: string;
  creativity: number;
  guidanceScale: number;
  variant: number;
}

/**
 * Enhanced subject description with professional YouTube thumbnail language
 */
function enhanceSubject(subject: string): string {
  if (!subject || subject.length < 5) return 'a person with an extreme over-the-top shocked expression, wide eyes, open mouth, looking directly at camera';
  
  const enhancements: Record<string, string> = {
    'shocked': 'extreme shocked expression, eyes wide, jaw dropped, looking at camera intensely',
    'surprise': 'dramatic surprised face, eyebrows raised, mouth open, genuine astonishment',
    'excited': 'over-the-top excited expression, huge smile, eyes lit up, high energy',
    'intense': 'intense focused expression, furrowed brows, determined look, staring straight ahead',
    'pointing': 'pointing directly at camera with exaggerated expression, engaged, energetic pose',
    'hoodie': 'wearing a hoodie, casual but intense expression, street style energy',
    'gamer': 'gamer expression of intense concentration or excitement, headset on, leaning forward',
    'smiling': 'huge confident smile, charismatic, approachable, camera-ready energy',
  };

  const lower = subject.toLowerCase();
  for (const [key, enhancement] of Object.entries(enhancements)) {
    if (lower.includes(key)) {
      return `${enhancement}, ${subject}`;
    }
  }

  return `${subject}, with an extreme high-energy expression, looking at camera, professional YouTube thumbnail pose`;
}

/**
 * Build a YouTube-optimized prompt (not cinematic - YouTube style)
 */
function buildYouTubePrompt(params: {
  topic: string;
  subject: string;
  preset: string;
  creativity: number;
  variant: number;
}): string {
  const { topic, preset } = params;
  const cleanTopic = topic.replace(/["""]/g, '').trim();
  const cleanSubject = enhanceSubject(params.subject);

  // Preset-specific configurations
  const presets: Record<string, {
    colors: string;
    background: string;
    style: string;
  }> = {
    'harry': {
      colors: 'bright yellow (#FFD700), deep dark blue (#0a0a2e), white (#FFFFFF)',
      background: 'solid dark gradient background, simple clean backdrop, blurred studio lights in background',
      style: 'CodeWithHarry style, bold yellow text on dark background, ultra clean, professional Indian YouTuber style, vibrant and clickable',
    },
    'tech': {
      colors: 'electric blue (#0066ff), bright orange (#ff6b00), dark navy (#0a1628)',
      background: 'dark tech-themed background with subtle circuit patterns, glowing blue accent lights slightly blurred',
      style: 'tech YouTuber style, blue and orange contrast, glowing futuristic elements, sharp and modern',
    },
    'gaming': {
      colors: 'fire red (#ff0033), bright yellow (#ffd700), dark charcoal (#1a1a1a)',
      background: 'dark gaming setup background with RGB lighting effects, colorful neon glow slightly blurred',
      style: 'gaming YouTuber style, red and yellow explosive energy, dynamic and high energy, ultra clickable',
    },
  };

  const p = presets[preset] || presets['harry'];

  return `Generate a YouTube thumbnail in 16:9 (1280x720). Subject: ${cleanSubject}. The face should fill ~40% of the frame, positioned center. Background: ${p.background}. Lighting: high contrast, key light from side, rim light to separate subject from background. Colors: ${p.colors}. Add a subtle glow or outline around the subject. NO TEXT in the generated image - text will be added separately. Style keywords: ${p.style}, professional YouTube thumbnail, high energy, clickable, pop effect, vibrant, sharp, 8K, clean background, subject pops out. Negative prompts: blurry, low resolution, flat lighting, cartoon, anime, dark underexposed, watermarks, logo, multiple faces, text in image, cluttered background, washed out, pixelated.`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as GenerateRequest;
    const {
      topic, subjectDescription, overlayText, imageModel,
      preset = 'harry', creativity = 7, guidanceScale = 7, variant = 0
    } = body;

    if (!topic) {
      return NextResponse.json({ error: 'Video topic is required' }, { status: 400 });
    }

    const prompt = buildYouTubePrompt({
      topic,
      subject: subjectDescription || '',
      preset,
      creativity,
      variant,
    });

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
        signal: AbortSignal.timeout(180000),
      });

      if (hiDreamRes.ok) {
        const data = await hiDreamRes.json();
        if (data.success && data.image) {
          const imageUrl = `data:image/png;base64,${data.image}`;
          return NextResponse.json({
            imageUrl,
            topic: displayText,
            prompt,
            preset,
            creativity,
          });
        }
      }
    } catch (hiDreamErr) {
      console.log('HiDream unavailable, using gradient fallback');
    }

    // Fallback: gradient data
    const gradientSets: Record<string, { name: string; colors: string[]; accent: string }[]> = {
      'harry': [
        { name: 'Harry Dark', colors: ['#0a0a2e', '#1a1a4e', '#0a0a2e'], accent: '#FFD700' },
        { name: 'Harry Midnight', colors: ['#000000', '#1a1a2e', '#0a0a2e'], accent: '#FFD700' },
      ],
      'tech': [
        { name: 'Tech Blue', colors: ['#0a1628', '#004e92', '#0a1628'], accent: '#0066ff' },
        { name: 'Tech Orange', colors: ['#1a0a00', '#cc6600', '#0a1628'], accent: '#ff6b00' },
      ],
      'gaming': [
        { name: 'Gaming Red', colors: ['#1a0000', '#4a0000', '#1a0000'], accent: '#ff0033' },
        { name: 'Gaming Fire', colors: ['#0a0000', '#4a0000', '#ff6b00'], accent: '#ffd700' },
      ],
    };

    const gradients = gradientSets[preset] || gradientSets['harry'];
    const gradient = gradients[variant % gradients.length];

    return NextResponse.json({
      gradient,
      topic: displayText,
      prompt,
      preset,
      creativity,
    });

  } catch (err: any) {
    console.error('Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}