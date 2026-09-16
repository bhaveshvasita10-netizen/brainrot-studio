import { NextResponse } from 'next/server';
import { createServiceClient, getAuthenticatedUser } from '@/lib/server';
export async function GET(request:Request){const user=await getAuthenticatedUser(request);if(!user)return NextResponse.json({connected:false});const service=createServiceClient();const {data}=await service.from('youtube_accounts').select('id,channel_name,channel_id').eq('user_id',user.id).limit(1).maybeSingle();return NextResponse.json({connected:Boolean(data),account:data?{id:data.id,channelName:data.channel_name,channelId:data.channel_id}:null});}
