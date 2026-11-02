import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
export async function POST(request:NextRequest,{params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!/^[0-9a-f]{64}$/.test(token))return NextResponse.json({error:'링크가 올바르지 않습니다.'},{status:404,headers});
 const bearer=request.headers.get('authorization')||'';
 if(!bearer.startsWith('Bearer '))return NextResponse.json({error:'로그인이 필요합니다.'},{status:401,headers});
 try{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw new Error('Supabase configuration missing');
  const accessToken=bearer.slice(7).trim();
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},db:{schema:'fitplan'},global:{headers:{Authorization:`Bearer ${accessToken}`}}});
  const {data:auth,error:authError}=await db.auth.getUser(accessToken);
  if(authError||!auth.user)return NextResponse.json({error:'로그인이 만료됐습니다. 다시 로그인해 주세요.'},{status:401,headers});
  const {data:id,error}=await db.rpc('copy_public_routine',{p_token:token});
  if(error)throw error;
  if(!id)return NextResponse.json({error:'공유가 종료된 루틴입니다.'},{status:404,headers});
  return NextResponse.json({id},{headers});
 }catch(e){console.error('Share copy failure',e instanceof Error?e.message:'unknown');return NextResponse.json({error:'루틴 복사에 실패했습니다.'},{status:503,headers});}
}
