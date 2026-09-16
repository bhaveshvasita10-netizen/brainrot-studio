import { createClient } from '@supabase/supabase-js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
];

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
}

export function youtubeCallbackUrl(requestUrl: string) {
  const base = appUrl() || new URL(requestUrl).origin;
  return `${base}/api/youtube/callback`;
}

export function youtubeAuthUrl(state: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_id: requiredEnv('YOUTUBE_CLIENT_ID'),
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: YOUTUBE_SCOPES.join(' '),
    state,
    include_granted_scopes: 'true',
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeYoutubeCode(code: string, redirectUri: string) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: requiredEnv('YOUTUBE_CLIENT_ID'),
      client_secret: requiredEnv('YOUTUBE_CLIENT_SECRET'),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
    cache: 'no-store',
  });

  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) throw new Error((data.error_description as string) || (data.error as string) || 'YouTube token exchange failed.');
  return data as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
  };
}

export async function fetchYoutubeChannel(accessToken: string) {
  const response = await fetch(`${YOUTUBE_API}/channels?part=snippet&mine=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  const data = (await response.json()) as {
    items?: Array<{ id?: string; snippet?: { title?: string; thumbnails?: Record<string, { url?: string }> } }>;
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(data.error?.message || 'Unable to read the YouTube channel.');
  const channel = data.items?.[0];
  if (!channel?.id) throw new Error('This Google account does not have a YouTube channel yet. Create a channel first, then reconnect it.');
  return {
    channelId: channel.id,
    channelName: channel.snippet?.title || 'YouTube channel',
    thumbnailUrl: channel.snippet?.thumbnails?.default?.url || null,
  };
}

export function serverSupabase() {
  return createClient(requiredEnv('NEXT_PUBLIC_SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function hmac(message: string) {
  const secret = requiredEnv('YOUTUBE_STATE_SECRET');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Buffer.from(new Uint8Array(signature)).toString('base64url');
}

export async function createYoutubeState(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 10 * 60 * 1000, nonce: crypto.randomUUID() })).toString('base64url');
  return `${payload}.${await hmac(payload)}`;
}

export async function readYoutubeState(state: string) {
  const [payload, signature] = state.split('.');
  if (!payload || !signature) throw new Error('Invalid OAuth state.');
  const secret = requiredEnv('YOUTUBE_STATE_SECRET');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  const valid = await crypto.subtle.verify('HMAC', key, Buffer.from(signature, 'base64url'), new TextEncoder().encode(payload));
  if (!valid) throw new Error('Invalid OAuth state signature.');
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { userId?: string; exp?: number };
  if (!data.userId || !data.exp || Date.now() > data.exp) throw new Error('OAuth state expired. Please reconnect YouTube.');
  return data;
}
