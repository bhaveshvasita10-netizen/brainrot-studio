import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server';
import { openAIRequest } from '@/lib/ai';

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error:'Sign in required.' },{status:401});
  try {
    const body = await request.json();
    const prompt = String(body.prompt || '');
    if (!prompt) return NextResponse.json({error:'Prompt is required.'},{status:400});
    const data = await openAIRequest('/images/generations',{method:'POST',body:JSON.stringify({model:process.env.OPENAI_IMAGE_MODEL||'gpt-image-1',prompt:`Original kid-friendly surreal 3D cartoon character. ${prompt}. No existing IP, no celebrity likeness, no logos, no text.`,size:body.size||'1024x1024',quality:body.quality||'medium'})});
    const image = data?.data?.[0];
    return NextResponse.json({mimeType:image?.mime_type||'image/png',base64:image?.b64_json||null,url:image?.url||null});
  } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:'Image generation failed.'},{status:500}); }
}
