import type {Routine,Workout} from './types';
import {dateISO} from './format';

export type PlanSlotStatus='done'|'missed'|'today'|'upcoming';
export type DayStatus='done'|'partial'|'missed'|'today'|'upcoming'|'rest'|'extra';

export type PlanSlot={
 routineId:string;
 routineTitle:string;
 exerciseCount:number;
 status:PlanSlotStatus;
};
export type PlannerDay={
 date:string;
 weekday:number;
 status:DayStatus;
 slots:PlanSlot[];
 recordedCount:number;
 completedCount:number;
};
export type PlannerWeek={
 start:string;
 end:string;
 days:PlannerDay[];
 planned:number;
 completed:number;
 missed:number;
 remaining:number;
 percentage:number;
};

const localDate=(iso:string)=>new Date(iso.slice(0,10)+'T12:00:00');
export const shiftDate=(iso:string,days:number)=>{
 const d=localDate(iso);
 d.setDate(d.getDate()+days);
 return dateISO(d);
};
export const mondayOf=(iso:string)=>{
 const weekday=localDate(iso).getDay();
 return shiftDate(iso,-((weekday+6)%7));
};

/**
 * A planned session is one (routine, weekday) with at least one item.
 * It is complete only when a saved workout exists for that routine on
 * the scheduled DATE, with at least one actual recorded set.
 * Freestyle workouts are shown separately, never silently counted as plan.
 * Unrecorded past plans = missed; today/future = not yet completed.
 *
 * Only plans after their routine's initial creation date are counted.
 * Editing a routine can reinterpret earlier weeks, because no historical
 * routine snapshots exist yet.
 */
export function calculatePlannerWeek(
 routines:Routine[],
 workouts:Workout[],
 today=dateISO(),
 weekOffset=0,
):PlannerWeek{
 const start=mondayOf(shiftDate(today,weekOffset*7));
 const saved=workouts.filter(w=>
  (w.workout_entries||[]).some(entry=>(entry.workout_sets||[]).length>0)
 );
 const days:PlannerDay[]=Array.from({length:7},(_,idx)=>{
  const date=shiftDate(start,idx);
  const weekday=localDate(date).getDay();
  const records=saved.filter(w=>w.performed_at===date);
  const slots:PlanSlot[]=routines.flatMap(routine=>{
   const firstDay=dateISO(new Date(routine.created_at));
   if(date<firstDay)return [];
   return (routine.routine_days||[])
    .filter(day=>day.weekday===weekday && (day.routine_items||[]).length>0)
    .map(day=>{
     const done=date<=today && records.some(w=>w.routine_id===routine.id);
     const status:PlanSlotStatus=done?'done':date<today?'missed':date===today?'today':'upcoming';
     return {
      routineId:routine.id,
      routineTitle:routine.title,
      exerciseCount:day.routine_items.length,
      status
     };
    });
  });
  const completedCount=slots.filter(slot=>slot.status==='done').length;
  let status:DayStatus;
  if(slots.length===0)status=records.length?'extra':'rest';
  else if(completedCount===slots.length)status='done';
  else if(completedCount>0)status='partial';
  else if(date<today)status='missed';
  else if(date===today)status='today';
  else status='upcoming';
  return {date,weekday,status,slots,recordedCount:records.length,completedCount};
 });
 const planned=days.reduce((sum,day)=>sum+day.slots.length,0);
 const completed=days.reduce((sum,day)=>sum+day.completedCount,0);
 const missed=days.reduce((sum,day)=>sum+day.slots.filter(slot=>slot.status==='missed').length,0);
 return {
  start,end:days[6].date,days,planned,completed,missed,
  remaining:planned-completed-missed,
  percentage:planned?Math.round(completed/planned*100):0
 };
}
