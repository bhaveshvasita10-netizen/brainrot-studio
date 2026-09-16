import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server';

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({error:'Sign in required.'},{status:401});
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({error:'AI provider is not configured. Add OPENAI_API_KEY in Vercel.'},{status:501});
  try {
    const body = await request.json();
    const input = String(body.input||'').slice(0,3500);
    if (!input) return NextResponse.json({error:'Narration is required.'},{status:400});
    const base=(process.env.OPENAI_BASE_URL||'https://api.openai.com/v1').replace(/\/$/,'');
    const response=await fetch(`${base}/audio/speech`,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_TTS_MODEL||'gpt-4o-mini-tts',voice:String(body.voice||'alloy'),input,response_format:'mp3'}),cache:'no-store'});
    if(!response.ok) return NextResponse.json({error:await response.text()},{status:response.status});
    const bytes=new Uint8Array(await response.arrayBuffer());
    return NextResponse.json({base64:Buffer.from(bytes).toString('base64'),mimeType:'audio/mpeg'});
  } catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Voice generation failed.'},{status:500});}
}
