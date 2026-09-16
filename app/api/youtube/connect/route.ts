import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server';

export async function POST(request:Request){
  const user=await getAuthenticatedUser(request); if(!user)return NextResponse.json({error:'Sign in required.'},{status:401});
  const clientId=process.env.YOUTUBE_CLIENT_ID; if(!clientId)return NextResponse.json({error:'YouTube OAuth is not configured. Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET.'},{status:501});
  const url=new URL(request.url); const redirectUri=process.env.YOUTUBE_REDIRECT_URI||`${url.origin}/api/youtube/callback`; const state=crypto.randomUUID();
  const params=new URLSearchParams({client_id:clientId,redirect_uri:redirectUri,response_type:'code',access_type:'offline',prompt:'consent',scope:'https://www.googleapis.com/auth/youtube.upload',state});
  const response=NextResponse.json({url:`https://accounts.google.com/o/oauth2/v2/auth?${params}`});
  response.cookies.set('yt_oauth_state',`${state}.${user.id}`,{httpOnly:true,secure:true,sameSite:'lax',maxAge:600,path:'/'}); return response;
}
