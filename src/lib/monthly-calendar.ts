import {mondayOf,shiftDate} from './planner';
import {dateISO} from './format';
import type {SavedWeekPlan,PlanVersion,PlanDay} from './weekly-plan';
import type {Workout} from './types';

export type CalendarStatus='done'|'partial'|'missed'|'today'|'upcoming'|'rest'|'extra'|'not-started'|'none';
export type CalendarExercise={
 exercise_id:string;target_sets:number;completed_sets:number;
};
export type CalendarDay={
 date:string;inMonth:boolean;weekday:number;status:CalendarStatus;
 routineTitle:string;routineId:string|null;
 plannedSets:number;completedSets:number;recordedSets:number;
 exercises:CalendarExercise[];workoutCount:number;
};
export type MonthResult={
 days:CalendarDay[];completedDays:number;partialDays:number;
 missedDays:number;workoutDays:number;plannedSets:number;
 completedSets:number;percentage:number;
};
const parse=(iso:string)=>new Date(iso+'T12:00:00');
const dow=(iso:string)=>parse(iso).getDay();
export const monthDates=(month:string):string[]=>{
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('유효하지 않은 월입니다.');
 const first=month+'-01';
 const next=month.slice(5)==='12'?(Number(month.slice(0,4))+1)+'-01-01':
  month.slice(0,4)+'-'+String(Number(month.slice(5))+1).padStart(2,'0')+'-01';
 const last=shiftDate(next,-1);
 const result:string[]=[];
 let day=mondayOf(first);
 do{result.push(day);day=shiftDate(day,1);}while(day<=last||result.length%7!==0);
 return result;
};
export const nextMonth=(month:string,offset:number):string=>{
 const date=new Date(month+'-15T12:00:00');
 date.setMonth(date.getMonth()+offset);
 return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
};
export const monthLabel=(month:string)=>month.slice(0,4)+'년 '+Number(month.slice(5))+'월';

export function plannedWeek(
 monday:string,saved:readonly SavedWeekPlan[],versions:readonly PlanVersion[]
):{days:PlanDay[];routineId:string|null;routineTitle:string;activation:PlanVersion|null}|null{
 const persisted=saved.find(p=>p.week_start===monday);
 const current=[...versions].filter(v=>v.effective_week<=monday)
  .sort((a,b)=>b.effective_week.localeCompare(a.effective_week)||b.created_at.localeCompare(a.created_at))[0]||null;
 if(persisted)return {
  days:persisted.days,routineId:persisted.routine_id,
  routineTitle:persisted.routine_title,activation:current
 };
 if(!current||!current.routine_id)return null;
 const days=current.days.map(d=>({
  weekday:d.weekday,
  items:current.effective_week===monday&&shiftDate(monday,(d.weekday+6)%7)<current.started_on
   ?[]:d.items
 }));
 return {days,routineId:current.routine_id,routineTitle:current.routine_title,activation:current};
}

export function makeMonth(
 month:string,workouts:readonly Workout[],saved:readonly SavedWeekPlan[],
 versions:readonly PlanVersion[],today=dateISO()
):MonthResult{
 const dates=monthDates(month);
 const byDate=new Map<string,Workout[]>();
 for(const w of workouts){
  const prev=byDate.get(w.performed_at)||[];
  prev.push(w);byDate.set(w.performed_at,prev);
 }
 const weekCache=new Map<string,ReturnType<typeof plannedWeek>>();
 const days=dates.map((date):CalendarDay=>{
  const monday=mondayOf(date);
  if(!weekCache.has(monday))weekCache.set(monday,plannedWeek(monday,saved,versions));
  const plan=weekCache.get(monday);
  const weekday=dow(date);
  const scheduled=plan?.days.find(d=>d.weekday===weekday)?.items||[];
  const records=byDate.get(date)||[];
  const actual=records.filter(w=>w.routine_id===plan?.routineId);
  const actualById=new Map<string,number>();
  for(const w of actual)for(const e of w.workout_entries||[]){
   actualById.set(e.exercise_id,(actualById.get(e.exercise_id)||0)+(e.workout_sets?.length||0));
  }
  const targets=new Map<string,number>();
  for(const e of scheduled)targets.set(e.exercise_id,(targets.get(e.exercise_id)||0)+e.target_sets);
  const exercises=[...targets.entries()].map(([exercise_id,target_sets])=>({
   exercise_id,target_sets,
   completed_sets:Math.min(target_sets,actualById.get(exercise_id)||0)
  }));
  const plannedSets=exercises.reduce((sum,x)=>sum+x.target_sets,0);
  const completedSets=exercises.reduce((sum,x)=>sum+x.completed_sets,0);
  const recordedSets=records.reduce((sum,w)=>sum+w.workout_entries.reduce(
   (n,e)=>n+e.workout_sets.length,0),0);
  let status:CalendarStatus;
  if(plannedSets>0)status=completedSets>=plannedSets?'done':
   completedSets>0?'partial':date<today?'missed':date===today?'today':'upcoming';
  else if(recordedSets>0)status='extra';
  else if(plan?.activation&&plan.activation.effective_week===monday&&
   date<plan.activation.started_on&&
   plan.activation.days.some(d=>d.weekday===weekday&&d.items.length>0))status='not-started';
  else status=plan?'rest':'none';
  return {date,inMonth:date.startsWith(month),weekday,status,
   routineTitle:plan?.routineTitle||'',routineId:plan?.routineId||null,
   plannedSets,completedSets,recordedSets,exercises,workoutCount:records.length};
 });
 const within=days.filter(d=>d.inMonth);
 const plannedSets=within.reduce((s,d)=>s+d.plannedSets,0);
 const completedSets=within.reduce((s,d)=>s+d.completedSets,0);
 return {days,plannedSets,completedSets,percentage:plannedSets?Math.round(completedSets/plannedSets*100):0,
  completedDays:within.filter(d=>d.status==='done').length,
  partialDays:within.filter(d=>d.status==='partial').length,
  missedDays:within.filter(d=>d.status==='missed').length,
  workoutDays:within.filter(d=>d.recordedSets>0).length
 };
}