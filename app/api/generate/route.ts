/// <reference types="node" />
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Replicate from 'replicate';
import Anthropic from '@anthropic-ai/sdk';

// Initialize clients – they will be undefined until env vars are provided at runtime
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN ?? '' });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' });

/**
 * POST /api/generate
 * Body: { topic: string, imageModel: 'dalle3' | 'stable-diffusion' }
 * Returns: { imageUrl: string, prompt: string }
 */
export async function POST(request: Request) {
  try {
    const { topic, imageModel } = await request.json();
    if (!topic || !imageModel) {
      return NextResponse.json({ error: 'Missing topic or imageModel' }, { status: 400 });
    }

    // Step 1 – Prompt generation using Anthropic Claude 3.5 Sonnet
    const promptResponse = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      temperature: 0,
      messages: [{ role: 'user', content: `Video topic: ${topic}` }],
    });
    const prompt = (promptResponse.content as any[])
      .filter((c) => typeof c === 'object' && 'text' in c)
      .map((c: any) => c.text)
      .join('')
      .trim();

    let imageUrl: string | null = null;

    // Step 2 – Image generation based on selected model
    if (imageModel === 'dalle3') {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        size: '1792x1024',
        quality: 'hd',
        n: 1,
      });
      imageUrl = response?.data?.[0]?.url ?? null;
    } else if (imageModel === 'stable-diffusion') {
      const result = (await replicate.run('stability-ai/stable-diffusion-xl', {
        input: { prompt, width: 1792, height: 1024 },
      })) as string[];
      imageUrl = result?.[0] ?? null;
    } else {
      return NextResponse.json({ error: 'Invalid imageModel' }, { status: 400 });
    }

    return NextResponse.json({ imageUrl, prompt });
  } catch (err: any) {
    console.error('Error in /api/generate:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
