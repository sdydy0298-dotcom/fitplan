import type {Workout} from './types';
import type {SavedWeekPlan} from './weekly-plan';
import {dateISO} from './format';

export type PlanSlotStatus='done'|'partial'|'missed'|'today'|'upcoming';
export type DayStatus='done'|'partial'|'missed'|'today'|'upcoming'|'rest'|'extra';
export type PlanSlot={
 routineId:string|null;routineTitle:string;exerciseCount:number;
 status:PlanSlotStatus;completedSets:number;targetSets:number;percentage:number;
};
export type PlannerDay={
 date:string;weekday:number;status:DayStatus;slots:PlanSlot[];
 recordedCount:number;completedCount:number;
};
export type PlannerWeek={
 start:string;end:string;days:PlannerDay[];
 planned:number;completed:number;partial:number;missed:number;remaining:number;
 plannedSets:number;completedSets:number;percentage:number;
};

const localDate=(iso:string)=>new Date(iso.slice(0,10)+'T12:00:00');
export const shiftDate=(iso:string,days:number)=>{
 const d=localDate(iso);d.setDate(d.getDate()+days);return dateISO(d);
};
export const mondayOf=(iso:string)=>{
 const weekday=localDate(iso).getDay();
 return shiftDate(iso,-((weekday+6)%7));
};

/** Derive adherence from an immutable weekly schedule snapshot plus recorded sets.
 * One day may be partially completed; extra/free workouts never inflate the score.
 * Weekly percentage is capped at the number of planned sets.
 */
export function calculatePlannerWeek(
 plan:SavedWeekPlan|null,
 workouts:Workout[],
 today=dateISO(),
 weekOffset=0
):PlannerWeek{
 const start=mondayOf(shiftDate(today,weekOffset*7));
 const active=plan?.week_start===start?plan:null;
 const recorded=workouts.filter(w=>(w.workout_entries||[])
  .some(entry=>(entry.workout_sets||[]).length>0));
 const days:PlannerDay[]=Array.from({length:7},(_,idx)=>{
  const date=shiftDate(start,idx);
  const weekday=localDate(date).getDay();
  const records=recorded.filter(w=>w.performed_at===date);
  const dayPlan=active?.days.find(d=>d.weekday===weekday);
  const items=dayPlan?.items||[];
  const slots:PlanSlot[]=[];
  if(items.length){
   const routineRecords=records.filter(w=>w.routine_id===active?.routine_id);
   const actualByExercise=new Map<string,number>();
   for(const w of routineRecords)for(const entry of w.workout_entries||[]){
    const count=(entry.workout_sets||[]).length;
    actualByExercise.set(entry.exercise_id,(actualByExercise.get(entry.exercise_id)||0)+count);
   }
   const targets=new Map<string,number>();
   for(const item of items){
    targets.set(item.exercise_id,(targets.get(item.exercise_id)||0)+item.target_sets);
   }
   const targetSets=[...targets.values()].reduce((sum,n)=>sum+n,0);
   const actualSets=[...targets.entries()].reduce(
    (sum,[id,target])=>sum+Math.min(target,actualByExercise.get(id)||0),0);
   const completedSets=date>today?0:actualSets;
   const status:PlanSlotStatus=completedSets>=targetSets?'done':
    completedSets>0?'partial':date<today?'missed':date===today?'today':'upcoming';
   slots.push({
    routineId:active?.routine_id||null,routineTitle:active?.routine_title||'운동 루틴',
    exerciseCount:items.length,status,completedSets,targetSets,
    percentage:targetSets?Math.round(completedSets/targetSets*100):0
   });
  }
  const completedCount=slots.filter(slot=>slot.status==='done').length;
  let status:DayStatus;
  if(!slots.length)status=records.length?'extra':'rest';
  else status=slots[0].status==='done'?'done':slots[0].status==='partial'?'partial':
   slots[0].status==='missed'?'missed':slots[0].status==='today'?'today':'upcoming';
  return {date,weekday,status,slots,recordedCount:records.length,completedCount};
 });
 const entries=days.flatMap(d=>d.slots);
 const planned=entries.length;
 const completed=entries.filter(x=>x.status==='done').length;
 const partial=entries.filter(x=>x.status==='partial').length;
 const missed=entries.filter(x=>x.status==='missed').length;
 const remaining=planned-completed-partial-missed;
 const plannedSets=entries.reduce((sum,x)=>sum+x.targetSets,0);
 const completedSets=entries.reduce((sum,x)=>sum+x.completedSets,0);
 return {
  start,end:days[6].date,days,planned,completed,partial,missed,remaining,
  plannedSets,completedSets,
  percentage:plannedSets?Math.round(completedSets/plannedSets*100):0
 };
}
