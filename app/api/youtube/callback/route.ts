import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/server';
import { encryptSecret } from '@/lib/crypto';

export async function GET(request:Request){
  const url=new URL(request.url); const code=url.searchParams.get('code'); const state=url.searchParams.get('state');
  const cookie=request.headers.get('cookie')?.match(/(?:^|;\s*)yt_oauth_state=([^;]+)/)?.[1]; const decoded=cookie?decodeURIComponent(cookie):''; const [savedState,userId]=decoded.split('.');
  if(!code||!state||!savedState||!userId||state!==savedState)return NextResponse.json({error:'Invalid or expired OAuth session.'},{status:400});
  const clientId=process.env.YOUTUBE_CLIENT_ID,clientSecret=process.env.YOUTUBE_CLIENT_SECRET; if(!clientId||!clientSecret)return NextResponse.json({error:'YouTube OAuth credentials are not configured.'},{status:501});
  try{
    const redirectUri=process.env.YOUTUBE_REDIRECT_URI||`${url.origin}/api/youtube/callback`;
    const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri,grant_type:'authorization_code'})});
    const tokens=await tokenResponse.json(); if(!tokenResponse.ok)throw new Error(JSON.stringify(tokens));
    const accountResponse=await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',{headers:{Authorization:`Bearer ${tokens.access_token}`}}); const channels=await accountResponse.json(); if(!accountResponse.ok)throw new Error(JSON.stringify(channels));
    const channel=channels?.items?.[0]; if(!channel?.id)throw new Error('No YouTube channel was returned.');
    const service=createServiceClient(); const {data:existing}=await service.from('youtube_accounts').select('id,refresh_token').eq('user_id',userId).limit(1).maybeSingle();
    const payload={user_id:userId,channel_name:channel?.snippet?.title||'YouTube channel',channel_id:channel.id,access_token:encryptSecret(tokens.access_token),refresh_token:tokens.refresh_token?encryptSecret(tokens.refresh_token):existing?.refresh_token||null};
    if(existing?.id)await service.from('youtube_accounts').update(payload).eq('id',existing.id);else await service.from('youtube_accounts').insert(payload);
    const response=NextResponse.redirect(`${url.origin}/?youtube=connected`);response.cookies.delete('yt_oauth_state');return response;
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'YouTube connection failed.'},{status:500});}
}
