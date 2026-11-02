import {NextRequest,NextResponse} from 'next/server';
import {adminDb} from '@/lib/admin';
import {getPublicRoutine} from '@/lib/share-server';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
export async function POST(request:NextRequest,{params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!/^[0-9a-f]{64}$/.test(token))return NextResponse.json({error:'링크가 올바르지 않습니다.'},{status:404,headers});
 const bearer=request.headers.get('authorization')||'';
 if(!bearer.startsWith('Bearer '))return NextResponse.json({error:'로그인이 필요합니다.'},{status:401,headers});
 try{
  const admin=adminDb();
  // User is verified by Supabase Auth. Never trust a user ID supplied by the browser.
  const {data:auth,error:authError}=await admin.auth.getUser(bearer.slice(7));
  if(authError||!auth.user)return NextResponse.json({error:'로그인이 만료됐습니다. 다시 로그인해 주세요.'},{status:401,headers});
  const source=await getPublicRoutine(token);
  if(!source)return NextResponse.json({error:'공유가 종료된 루틴입니다.'},{status:404,headers});
  const {data:newRoutine,error:createError}=await admin.from('routines').insert({owner_id:auth.user.id,title:`${source.title} · 내 루틴`,description:source.description}).select('id').single();
  if(createError||!newRoutine)throw createError||new Error('Copy failed');
  try{
   for(const day of source.routine_days){
    const {data:newDay,error:dayErr}=await admin.from('routine_days').insert({routine_id:newRoutine.id,weekday:day.weekday,position:day.position}).select('id').single();
    if(dayErr||!newDay)throw dayErr||new Error('Copy day failed');
    if(day.routine_items.length){const{error:itemErr}=await admin.from('routine_items').insert(day.routine_items.map(i=>({routine_day_id:newDay.id,exercise_id:i.exercise_id,position:i.position,target_sets:i.target_sets,target_reps:i.target_reps,target_weight:i.target_weight,notes:i.notes})));if(itemErr)throw itemErr;}
   }
  }catch(err){await admin.from('routines').delete().eq('id',newRoutine.id).eq('owner_id',auth.user.id);throw err;}
  return NextResponse.json({id:newRoutine.id},{headers});
 }catch(e){console.error('Share copy failure',e instanceof Error?e.message:'unknown');return NextResponse.json({error:'루틴 복사에 실패했습니다.'},{status:503,headers});}
}
