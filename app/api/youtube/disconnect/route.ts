import { NextResponse } from 'next/server';
import { createServiceClient, getAuthenticatedUser } from '@/lib/server';

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const service = createServiceClient();
  const { error } = await service.from('youtube_accounts').delete().eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connected: false });
}
