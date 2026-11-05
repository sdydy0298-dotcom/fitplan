import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store, max-age=0','Referrer-Policy':'no-referrer'};

export type DiscoverRoutine={
 token:string;title:string;description:string;days:number;exercises:number;
 weekdays:number[];shared_at:string;
};

export async function GET(){
 try{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return NextResponse.json({error:'목록 서비스를 연결하지 못했습니다.'},{status:503,headers});
  const db=createClient(url,key,{
   auth:{persistSession:false,autoRefreshToken:false},
   db:{schema:'fitplan'}
  });
  const {data,error}=await db.rpc('list_discoverable_routines',{p_limit:60});
  if(error)throw error;
  if(!Array.isArray(data))throw new Error('Unexpected public catalog response');
  // The SQL RPC only exposes owner-approved routine summaries, never identities.
  return NextResponse.json({items:data as DiscoverRoutine[]},{headers});
 }catch(e){
  console.error('Discover routine listing failure',e instanceof Error?e.message:'unknown');
  return NextResponse.json({error:'공개 루틴 목록을 불러올 수 없습니다.'},{status:503,headers});
 }
}