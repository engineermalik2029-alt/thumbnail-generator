import { NextResponse } from 'next/server';

/**
 * YouTube Thumbnail Generator using Google Gemini 2.0 Flash
 * Free API - 500+ images per day
 */

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent';

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiCandidate {
  content: { parts: GeminiPart[] };
}

interface GeminiResponse {
  candidates: GeminiCandidate[];
}

function buildThumbnailPrompt(params: {
  topic: string;
  subject: string;
  preset: string;
  textPosition: string;
}): string {
  const { topic, subject, preset, textPosition } = params;
  const cleanTopic = topic.replace(/["""]/g, '').trim();
  const cleanSubject = subject || 'a person with an extreme shocked expression';

  // Map position to frame placement
  const positionMap: Record<string, string> = {
    bottom: 'center',
    top: 'center',
    center: 'center'
  };
  const framePos = positionMap[textPosition] || 'center';

  // Preset-specific color/lighting hints
  const presets: Record<string, { colors: string; lighting: string; style: string }> = {
    harry: {
      colors: 'bold yellow (#FFD700) + deep dark blue (#0a0a2e) + white',
      lighting: 'dramatic studio lighting, strong rim light, high contrast',
      style: 'CodeWithHarry style, dark background, vibrant yellow accents, ultra clean and clickable',
    },
    tech: {
      colors: 'electric blue (#0066ff) + bright orange (#ff6b00) + dark navy',
      lighting: 'cool blue key light with warm orange rim light, futuristic glow',
      style: 'tech YouTube style, blue/orange contrast, glowing futuristic elements, sharp modern look',
    },
    gaming: {
      colors: 'fire red (#ff0033) + bright yellow (#ffd700) + dark charcoal',
      lighting: 'dramatic red and yellow stage lighting, explosive energy, neon glow',
      style: 'gaming YouTube style, red/yellow explosive energy, dynamic high-energy clickable thumbnail',
    },
  };

  const p = presets[preset] || presets.harry;

  return `Create a YouTube thumbnail image. 16:9 aspect ratio, 1280x720, high resolution. Subject: ${cleanSubject} with an extreme, over-the-top facial expression - shocked, screaming, or intense. Face fills about 40% of the frame, positioned ${framePos}. Background: simple, stylized, slightly blurred dark background relating to "${cleanTopic}". Colors: vibrant, high contrast, using ${p.colors}. Lighting: ${p.lighting}. Style: ${p.style}, digital art, bold black outlines, cell-shaded, pop effect, like a pro YouTube thumbnail. Do NOT include any text, letters, or words in the image. Negative prompts: photorealism, oil painting, watercolor, blurry, low resolution, multiple faces, cluttered, flat lighting.`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      topic, subjectDescription, overlayText, imageModel,
      preset = 'harry', textPosition = 'bottom', apiKey = '',
      variant = 0
    } = body;

    if (!topic) {
      return NextResponse.json({ error: 'Video topic is required' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is required. Get one free at https://aistudio.google.com/apikey' }, { status: 400 });
    }

    const prompt = buildThumbnailPrompt({
      topic,
      subject: subjectDescription || '',
      preset,
      textPosition,
    });

    const displayText = (overlayText || topic).toUpperCase();

    // Call Google Gemini 2.0 Flash for image generation
    try {
      const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.9,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            responseModalities: ['IMAGE']
          }
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        let errMsg = 'Gemini API error';
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.error?.message || errMsg;
        } catch {}
        
        // Handle quota/rate limit errors
        if (geminiRes.status === 429) {
          return NextResponse.json({ error: 'API rate limit exceeded. Please wait a moment and try again, or use a different API key.' }, { status: 429 });
        }
        if (geminiRes.status === 403) {
          return NextResponse.json({ error: 'Invalid API key. Please check your key at https://aistudio.google.com/apikey' }, { status: 403 });
        }
        return NextResponse.json({ error: errMsg }, { status: geminiRes.status });
      }

      const data = await geminiRes.json() as GeminiResponse;

      if (!data.candidates || data.candidates.length === 0) {
        return NextResponse.json({ error: 'No image generated. The model may have been filtered.' }, { status: 500 });
      }

      const parts = data.candidates[0].content.parts;
      const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

      if (!imagePart?.inlineData?.data) {
        return NextResponse.json({ error: 'No image data in response. The model returned text instead.' }, { status: 500 });
      }

      const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

      return NextResponse.json({
        imageUrl,
        topic: displayText,
        prompt,
        preset,
      });

    } catch (fetchErr: any) {
      console.error('Gemini fetch error:', fetchErr);
      if (fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError') {
        return NextResponse.json({ error: 'Request timed out. Gemini may be busy. Try again.' }, { status: 504 });
      }
      return NextResponse.json({ error: `Failed to connect to Gemini API: ${fetchErr.message}` }, { status: 500 });
    }

  } catch (err: any) {
    console.error('Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}