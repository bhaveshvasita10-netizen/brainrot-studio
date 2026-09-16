import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server';
import { extractText, openAIRequest } from '@/lib/ai';

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  try {
    const body = await request.json();
    const character = body.character as { name?: string; animal?: string };
    const prompt = String(body.prompt || '');
    const length = Math.min(10, Math.max(3, Number(body.scenes || 6)));
    const data = await openAIRequest('/responses', {
      method: 'POST',
      body: JSON.stringify({
        model: process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',
        input: `Create an original, child-safe surreal cartoon short for Brainrot Studio.\nCharacter: ${character?.name || 'Unknown'} (${character?.animal || 'animal'})\nCreative direction: ${prompt || 'funny adventure with a simple positive lesson'}\nReturn ONLY valid JSON with keys title, description, and scenes. scenes must be an array of exactly ${length} objects with keys: narration, visual, onScreenText. Keep narration short and age-appropriate. Do not use existing copyrighted characters, logos, songs, or catchphrases.`
      })
    });
    const text = extractText(data).replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    return NextResponse.json({ story: JSON.parse(text) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Story generation failed.' }, { status: 500 });
  }
}
