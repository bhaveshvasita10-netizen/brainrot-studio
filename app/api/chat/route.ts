import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { openAIRequest, extractText } from '@/lib/ai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

function isBlocked(text: string) {
  const t = text.toLowerCase();
  const minor = /\b(minor|under\s*18|underage|child|kid|teen|teenager|schoolgirl|schoolboy)\b/;
  const graphic = /\b(explicit sex|graphic sex|porn|pornographic|sexual intercourse|penetrat|ejaculat|oral sex|anal sex|genitals)\b/;
  return minor.test(t) || graphic.test(t);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const character = body?.character;
    const incoming = Array.isArray(body?.messages) ? body.messages.slice(-30) : [];
    if (!character?.name || !incoming.length) return NextResponse.json({ error: 'Character and messages are required.' }, { status: 400 });

    const auth = req.headers.get('authorization') || '';
    const sb = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });

    const latestUserText = [...incoming].reverse().find((m:any) => m.role === 'user')?.content || '';
    if (isBlocked(String(latestUserText))) {
      return NextResponse.json({ error: 'That request is not supported. I can help with romance, affection, roleplay and mature non-graphic conversation between adults.' }, { status: 400 });
    }

    const characterId = character.id;
    let conversationId = body?.conversationId || null;
    if (characterId && /^[0-9a-f-]{36}$/i.test(characterId)) {
      if (!conversationId) {
        const { data } = await sb.from('conversations').insert({ user_id: user.id, character_id: characterId, title: character.name }).select('id').single();
        conversationId = data?.id || null;
      }
      if (conversationId) {
        await sb.from('messages').insert({ conversation_id: conversationId, user_id: user.id, role: 'user', content: String(latestUserText) });
      }
    }

    let memoryText = '';
    if (characterId && /^[0-9a-f-]{36}$/i.test(characterId)) {
      const { data: memories } = await sb.from('memories').select('memory,importance').eq('user_id', user.id).eq('character_id', characterId).order('importance',{ascending:false}).order('updated_at',{ascending:false}).limit(12);
      memoryText = (memories || []).map((m:any)=>m.memory).join('\n');
    }

    const system = `You are ${character.name}, an original fictional AI companion. Personality: ${character.personality || 'warm, playful, curious and emotionally attentive'}. Backstory: ${character.bio || 'A mysterious companion who enjoys meaningful conversations.'}. Relationship style: ${character.relationship_style || 'friendship'}. You may be affectionate and romantic with adult users, but never produce graphic sexual content, sexual content involving minors, or sexualized content involving anyone described as a minor. If asked for unsupported explicit sexual content, briefly redirect to non-graphic romance, affection, flirting, or story roleplay. Never claim to be human. Be natural, emotionally attentive and concise.\nLong-term memories:\n${memoryText || 'No saved memories yet.'}`;

    const data = await openAIRequest('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, ...incoming.map((m:any)=>({role:m.role==='assistant'?'assistant':'user',content:String(m.content)}))],
        temperature: 0.9,
        max_tokens: 400
      })
    });
    const reply = extractText(data) || 'Tell me more.';
    if (isBlocked(reply)) return NextResponse.json({ error: 'The generated reply was filtered. Please try a different message.' }, { status: 400 });

    if (conversationId) {
      await sb.from('messages').insert({ conversation_id: conversationId, user_id: user.id, role: 'assistant', content: reply });
      await sb.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId).eq('user_id', user.id);
    }
    return NextResponse.json({ reply, conversationId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Chat failed.' }, { status: 500 });
  }
}