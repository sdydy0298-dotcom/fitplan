'use client';
import {browserDb} from './supabase';
import {dateISO} from './format';
import {mondayOf,shiftDate} from './planner';
import type {Routine} from './types';

export type PlanItem={
 key:string;exercise_id:string;target_sets:number;target_reps:number;
 target_weight:number;notes:string;
};
export type PlanDay={weekday:number;items:PlanItem[]};
export type PlanVersion={
 id:string;user_id:string;routine_id:string|null;routine_title:string;
 effective_week:string;started_on:string;days:PlanDay[];reason:string;created_at:string;
};
export type SavedWeekPlan={
 id:string;user_id:string;week_start:string;routine_id:string|null;
 routine_title:string;days:PlanDay[];created_at:string;updated_at:string;
};

export const emptyPlan=():PlanDay[]=>Array.from({length:7},(_,weekday)=>({weekday,items:[]}));
export const snapshotRoutine=(routine:Routine):PlanDay[]=>{
 const days=emptyPlan();
 for(const day of routine.routine_days||[]){
  if(day.weekday<0||day.weekday>6)continue;
  days[day.weekday].items=[...(day.routine_items||[])]
   .sort((a,b)=>a.position-b.position)
   .map(it=>({
    key:crypto.randomUUID(),exercise_id:it.exercise_id,
    target_sets:Number(it.target_sets),target_reps:Number(it.target_reps),
    target_weight:Number(it.target_weight),notes:it.notes||''
   }));
 }
 return days;
};
const filterInitialWeek=(days:PlanDay[],monday:string,startedOn:string):PlanDay[]=>
 days.map(day=>({
  weekday:day.weekday,
  items:shiftDate(monday,(day.weekday+6)%7)<startedOn?[]:day.items.map(it=>({...it}))
 }));

function checkWeekItems(days:PlanDay[]):void{
 if(days.length!==7||days.some((d,i)=>d.weekday!==i||!Array.isArray(d.items)||d.items.length>40)){
  throw new Error('주간 운동 계획 형식이 잘못됐습니다.');
 }
 if(days.some(d=>d.items.some(it=>
  !it.key||it.key.length>100||!it.exercise_id||it.exercise_id.length>100||
  !Number.isInteger(it.target_sets)||it.target_sets<1||it.target_sets>15||
  !Number.isInteger(it.target_reps)||it.target_reps<1||it.target_reps>300||
  !Number.isFinite(it.target_weight)||it.target_weight<0||it.target_weight>2000||
  (it.notes||'').length>250
 )))throw new Error('운동 종목의 목표 세트·횟수·중량을 확인해 주세요.');
}
async function me():Promise<string>{
 const {data,error}=await browserDb().auth.getUser();
 if(error||!data.user)throw new Error('로그인이 필요합니다.');
 return data.user.id;
}
export async function versionForWeek(weekStart:string):Promise<PlanVersion|null>{
 const {data,error}=await browserDb().from('plan_versions')
  .select('*').lte('effective_week',weekStart)
  .order('effective_week',{ascending:false})
  .order('created_at',{ascending:false})
  .limit(1).maybeSingle();
 if(error)throw new Error('활성 루틴을 불러오지 못했습니다. '+error.message);
 return data as PlanVersion|null;
}
export async function getWeekPlan(weekStart:string,today=dateISO()):Promise<SavedWeekPlan|null>{
 const start=mondayOf(weekStart);
 if(start!==weekStart)throw new Error('주간 시작 날짜가 올바르지 않습니다.');
 const db=browserDb();
 const {data:existing,error:readError}=await db.from('weekly_plans')
  .select('*').eq('week_start',weekStart).maybeSingle();
 if(readError)throw new Error('주간 계획을 불러올 수 없습니다. '+readError.message);
 if(existing)return existing as SavedWeekPlan;
 // Do not create future weeks in advance; future weeks remain projections.
 if(weekStart>mondayOf(today))return null;
 const version=await versionForWeek(weekStart);
 if(!version||!version.routine_id)return null;
 const days=weekStart===version.effective_week
  ?filterInitialWeek(version.days,weekStart,version.started_on)
  :version.days;
 checkWeekItems(days);
 const {data:created,error:createError}=await db.from('weekly_plans').insert({
  user_id:await me(),week_start:weekStart,
  routine_id:version.routine_id,routine_title:version.routine_title,days
 }).select('*').single();
 if(createError?.code==='23505'){
  const {data:other,error:otherError}=await db.from('weekly_plans')
   .select('*').eq('week_start',weekStart).maybeSingle();
  if(otherError)throw otherError;
  return other as SavedWeekPlan|null;
 }
 if(createError)throw new Error('주간 계획 생성에 실패했습니다. '+createError.message);
 return created as SavedWeekPlan;
}
export async function startRoutine(routine:Routine,today=dateISO()):Promise<SavedWeekPlan>{
 const days=snapshotRoutine(routine);
 checkWeekItems(days);
 if(!days.some(d=>d.items.length))throw new Error('운동이 있는 루틴만 시작할 수 있습니다.');
 const db=browserDb(),userId=await me(),weekStart=mondayOf(today);
 // Also override any previously queued next-week template for an older
 // routine; the selected routine must continue every week until changed.
 const nextMonday=shiftDate(weekStart,7);
 const {error:versionError}=await db.from('plan_versions').insert([
  {user_id:userId,routine_id:routine.id,routine_title:routine.title,
   effective_week:weekStart,started_on:today,days,reason:'activation'},
  {user_id:userId,routine_id:routine.id,routine_title:routine.title,
   effective_week:nextMonday,started_on:nextMonday,days,reason:'activation'}
 ]);
 if(versionError)throw new Error('루틴을 시작하지 못했습니다. '+versionError.message);
 const currentDays=filterInitialWeek(days,weekStart,today);
 const {data,error}=await db.from('weekly_plans').upsert({
  user_id:userId,week_start:weekStart,routine_id:routine.id,
  routine_title:routine.title,days:currentDays,
  updated_at:new Date().toISOString()
 },{onConflict:'user_id,week_start'}).select('*').single();
 if(error)throw new Error('이번 주 계획 적용에 실패했습니다. 다시 플래너를 열어 주세요. '+error.message);
 return data as SavedWeekPlan;
}
export async function updateFutureTemplate(routine:Routine,today=dateISO()):Promise<boolean>{
 const weekStart=mondayOf(today);
 const current=await versionForWeek(weekStart);
 if(!current||current.routine_id!==routine.id)return false;
 const days=snapshotRoutine(routine);
 checkWeekItems(days);
 const nextWeek=shiftDate(weekStart,7);
 const {error}=await browserDb().from('plan_versions').insert({
  user_id:await me(),routine_id:routine.id,routine_title:routine.title,
  effective_week:nextWeek,started_on:nextWeek,days,reason:'template_update'
 });
 if(error)throw new Error('루틴은 저장됐지만 이후 주간 계획 적용에 실패했어요. '+error.message);
 return true;
}
export async function saveThisWeek(plan:SavedWeekPlan,days:PlanDay[]):Promise<SavedWeekPlan>{
 if(plan.week_start!==mondayOf(dateISO()))throw new Error('이번 주 계획만 편집할 수 있습니다.');
 checkWeekItems(days);
 const {data,error}=await browserDb().from('weekly_plans')
  .update({days,updated_at:new Date().toISOString()})
  .eq('id',plan.id).eq('updated_at',plan.updated_at)
  .select('*').maybeSingle();
 if(error)throw new Error('주간 계획을 저장하지 못했습니다. '+error.message);
 if(!data)throw new Error('다른 화면에서 계획을 변경했습니다. 새로고침 후 다시 수정해 주세요.');
 return data as SavedWeekPlan;
}
