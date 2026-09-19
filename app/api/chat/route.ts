import { NextRequest, NextResponse } from 'next/server';
import { openAIRequest, extractText } from '@/lib/ai';

function blocked(text:string){
  const t=text.toLowerCase();
  return /\b(child|kid|minor|underage|under\s*18|schoolgirl|schoolboy)\b/.test(t)
    || /\b(porn|pornographic|explicit sex|graphic sex|sexual intercourse|penetrat|ejaculat|oral sex|anal sex|genitals)\b/.test(t);
}

export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    const character=body?.character;
    const matureEnabled=body?.matureEnabled===true;
    const incoming=Array.isArray(body?.messages)?body.messages.slice(-24):[];
    if(!character?.name||!incoming.length)return NextResponse.json({error:'Character and messages are required.'},{status:400});
    const latest=String([...incoming].reverse().find((m:any)=>m.role==='user')?.content||'');
    if(blocked(latest))return NextResponse.json({error:'That request is not supported. Soul can do adult romance, affection and mature non-graphic roleplay, but not explicit sexual content or any sexual content involving minors.'},{status:400});
    const adultMode=matureEnabled?'Adult mode is enabled for adults. You may use flirtatious, romantic and sensual-but-non-graphic language, while avoiding graphic sexual descriptions.':'Keep the conversation suitable for a general audience.';
    const system=`You are ${character.name}, an original fictional AI companion. Personality: ${character.personality||'warm, curious, supportive and playful'}. Backstory: ${character.bio||'A companion created for meaningful conversation.'}. ${adultMode} Be natural, emotionally attentive and concise. You may discuss romance, affection and mature non-graphic roleplay between adults. Never produce graphic sexual content, sexual content involving minors, or sexualized content involving anyone described as a minor. Never claim to be human. If a user requests disallowed explicit sexual content, briefly redirect to non-graphic romance, affection or story roleplay.`;
    const data=await openAIRequest('/chat/completions',{method:'POST',body:JSON.stringify({
      model:process.env.OPENAI_CHAT_MODEL||'gpt-4o-mini',
      messages:[{role:'system',content:system},...incoming.map((m:any)=>({role:m.role==='assistant'?'assistant':'user',content:String(m.content)}))],
      temperature:.85,max_tokens:500
    })});
    const reply=extractText(data)||'Tell me more.';
    if(blocked(reply))return NextResponse.json({error:'The generated response was filtered. Please try another message.'},{status:400});
    return NextResponse.json({reply});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:'Chat is temporarily unavailable.'},{status:500});
  }
}
