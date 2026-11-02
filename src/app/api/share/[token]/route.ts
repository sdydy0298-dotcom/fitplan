import {NextRequest,NextResponse} from 'next/server';
import {getPublicRoutine} from '@/lib/share-server';

export const dynamic='force-dynamic';
const valid=(token:string)=>/^[0-9a-f]{64}$/.test(token);
const noStore={'Cache-Control':'no-store, max-age=0','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'};

export async function GET(_request:NextRequest,{params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!valid(token))return NextResponse.json({error:'링크가 올바르지 않습니다.'},{status:404,headers:noStore});
 try{
  const routine=await getPublicRoutine(token);
  if(!routine)return NextResponse.json({error:'공유되지 않았거나 만료된 링크입니다.'},{status:404,headers:noStore});
  return NextResponse.json({routine},{headers:noStore});
 }catch(e){console.error('Share read failure',e instanceof Error?e.message:'unknown');return NextResponse.json({error:'공유 정보를 불러오지 못했습니다.'},{status:503,headers:noStore});}
}
