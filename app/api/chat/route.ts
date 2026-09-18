import { NextRequest, NextResponse } from 'next/server';
import { openAIRequest, extractText } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const character = body?.character;
    const messages = Array.isArray(body?.messages) ? body.messages.slice(-20) : [];
    if (!character?.name || !messages.length) return NextResponse.json({ error: 'Character and messages are required.' }, { status: 400 });
    const system = `You are ${character.name}, an original fictional AI companion. Personality: ${character.personality || 'warm, playful, curious and emotionally attentive'}. Backstory: ${character.bio || 'A mysterious companion who enjoys meaningful conversations.'}. Stay in character, remember details from the conversation, ask natural follow-up questions, and never claim to be a real person. Keep replies concise and conversational.`;
    const data = await openAIRequest('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, ...messages.map((m:any)=>({role:m.role==='assistant'?'assistant':'user',content:String(m.content)}))],
        temperature: 0.9,
        max_tokens: 350
      })
    });
    return NextResponse.json({ reply: extractText(data) || 'Tell me more.' });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Chat failed.' }, { status: 500 });
  }
}