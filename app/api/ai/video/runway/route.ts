import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server';

const RUNWAY_URL = 'https://api.dev.runwayml.com/v1/image_to_video';

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const key = process.env.RUNWAYML_API_SECRET;
  if (!key) {
    return NextResponse.json(
      { error: 'Runway is not configured. Add RUNWAYML_API_SECRET in Vercel.' },
      { status: 501 }
    );
  }

  try {
    const body = await request.json();
    const promptImage = String(body.promptImage || '');
    const promptText = String(body.promptText || '').slice(0, 4000);
    if (!promptImage) return NextResponse.json({ error: 'Character image is required.' }, { status: 400 });
    if (!promptText) return NextResponse.json({ error: 'Video prompt is required.' }, { status: 400 });

    if (!promptImage.startsWith('data:image/')) {
      return NextResponse.json({ error: 'The Runway image input must be an image data URI.' }, { status: 400 });
    }

    const response = await fetch(RUNWAY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify({
        model: process.env.RUNWAY_VIDEO_MODEL || 'gen4.5',
        promptImage,
        promptText,
        ratio: '768:1280',
        duration: Number(body.duration) === 10 ? 10 : 5,
      }),
      cache: 'no-store',
    });

    const text = await response.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!response.ok) {
      return NextResponse.json({ error: data?.error || data?.message || text }, { status: response.status });
    }

    return NextResponse.json({ taskId: data?.id, status: data?.status || 'PENDING' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Runway video generation failed.' }, { status: 500 });
  }
}
