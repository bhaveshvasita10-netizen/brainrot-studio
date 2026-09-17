import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const key = process.env.RUNWAYML_API_SECRET;
  if (!key) return NextResponse.json({ error: 'Runway is not configured.' }, { status: 501 });

  const taskId = new URL(request.url).searchParams.get('taskId');
  if (!taskId || !/^[A-Za-z0-9-]+$/.test(taskId)) {
    return NextResponse.json({ error: 'Valid taskId is required.' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${key}`,
        'X-Runway-Version': '2024-11-06',
      },
      cache: 'no-store',
    });
    const text = await response.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!response.ok) {
      return NextResponse.json({ error: data?.error || data?.message || text }, { status: response.status });
    }

    return NextResponse.json({
      taskId: data?.id || taskId,
      status: data?.status,
      outputUrl: Array.isArray(data?.output) ? data.output[0] || null : null,
      failure: data?.failure || data?.failureCode || null,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not retrieve Runway task.' }, { status: 500 });
  }
}
