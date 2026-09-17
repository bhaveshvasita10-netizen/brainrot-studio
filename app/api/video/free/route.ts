import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authHeaders() {
  const token = process.env.HUGGINGFACE_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readGradioEvent(baseUrl: string, eventId: string) {
  const response = await fetch(`${baseUrl}/call/generate_video/${eventId}`, {
    headers: { ...authHeaders(), Accept: 'text/event-stream' },
    cache: 'no-store',
  });
  if (!response.ok || !response.body) {
    throw new Error(`Free GPU worker result request failed (${response.status}).`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      const lines = event.split('\n');
      const kind = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
      const dataLine = lines.find((line) => line.startsWith('data:'))?.slice(5).trim();
      if (kind === 'error') throw new Error(dataLine || 'Free GPU worker failed.');
      if (kind === 'complete' && dataLine) {
        const data = JSON.parse(dataLine);
        return data?.[0] ?? data;
      }
    }

    if (done) break;
  }

  throw new Error('Free GPU worker ended without a result.');
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const baseUrl = process.env.HUGGINGFACE_ZERO_GPU_URL?.replace(/\/$/, '');
  if (!baseUrl) {
    return NextResponse.json({ error: 'HUGGINGFACE_ZERO_GPU_URL is not configured.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const prompt = String(body.prompt || '').trim();
    if (!prompt) return NextResponse.json({ error: 'prompt is required.' }, { status: 400 });

    const seconds = Math.max(2, Math.min(Number(body.seconds || 3), 4));
    const seed = Number.isFinite(Number(body.seed)) ? Number(body.seed) : 0;
    const imageUrl = typeof body.imageUrl === 'string' && body.imageUrl.startsWith('http') ? body.imageUrl : null;

    const submit = await fetch(`${baseUrl}/call/generate_video`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [prompt, imageUrl ? { path: imageUrl } : null, seconds, seed] }),
      cache: 'no-store',
    });

    if (!submit.ok) {
      const text = await submit.text();
      return NextResponse.json({ error: `Free GPU worker rejected the job (${submit.status}).`, details: text.slice(0, 500) }, { status: 502 });
    }

    const queued = await submit.json();
    if (!queued?.event_id) throw new Error('Free GPU worker did not return an event id.');

    const result = await readGradioEvent(baseUrl, queued.event_id);
    return NextResponse.json({ ok: true, provider: 'huggingface-zerogpu', result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Free AI video generation failed.' }, { status: 502 });
  }
}
