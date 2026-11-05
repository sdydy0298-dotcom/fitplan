import type {Workout} from './types';
import type {SavedWeekPlan,PlanVersion} from './weekly-plan';
import {mondayOf,shiftDate} from './planner';
import {plannedWeek} from './monthly-calendar';
import {dateISO} from './format';

export type WeekTrend={
 week:string;label:string;sets:number;days:number;
 plannedSets:number;completedSets:number;adherence:number|null;
};
export type WeightPoint={date:string;best:number;sets:number;reps:number};

export function weeklyTrend(
 workouts:readonly Workout[],plans:readonly SavedWeekPlan[],
 versions:readonly PlanVersion[],weeks=12,today=dateISO()
):WeekTrend[]{
 const count=Math.max(1,Math.min(weeks,52));
 const anchor=mondayOf(today);
 return Array.from({length:count},(_,i)=>{
  const week=shiftDate(anchor,(i-count+1)*7);
  const end=shiftDate(week,6);
  const inWeek=workouts.filter(w=>w.performed_at>=week&&w.performed_at<=end&&w.performed_at<=today);
  const dates=new Set(inWeek.filter(w=>w.workout_entries.some(e=>e.workout_sets.length>0)).map(w=>w.performed_at));
  const sets=inWeek.reduce((s,w)=>s+w.workout_entries.reduce((n,e)=>n+e.workout_sets.length,0),0);
  const schedule=plannedWeek(week,plans,versions);
  let plannedSets=0,completedSets=0;
  if(schedule){
   for(const d of schedule.days){
    const day=shiftDate(week,(d.weekday+6)%7);
    const goal=new Map<string,number>();
    for(const item of d.items)goal.set(item.exercise_id,(goal.get(item.exercise_id)||0)+item.target_sets);
    plannedSets+=[...goal.values()].reduce((a,n)=>a+n,0);
    if(day>today)continue;
    const actual=new Map<string,number>();
    for(const w of inWeek.filter(w=>w.performed_at===day&&w.routine_id===schedule.routineId)){
     for(const e of w.workout_entries)actual.set(e.exercise_id,(actual.get(e.exercise_id)||0)+e.workout_sets.length);
    }
    for(const [id,target] of goal.entries())completedSets+=Math.min(target,actual.get(id)||0);
   }
  }
  return {
   week,label:week.slice(5).replace('-','/'),days:dates.size,sets,
   plannedSets,completedSets,
   adherence:plannedSets>0?Math.round(completedSets/plannedSets*100):null
  };
 });
}
export function weightHistory(workouts:readonly Workout[],exerciseId:string,from?:string):WeightPoint[]{
 const values=new Map<string,WeightPoint>();
 for(const w of workouts){
  if(from&&w.performed_at<from)continue;
  for(const e of w.workout_entries){
   if(e.exercise_id!==exerciseId||!e.workout_sets.length)continue;
   const latest=values.get(w.performed_at)||{date:w.performed_at,best:0,sets:0,reps:0};
   latest.best=Math.max(latest.best,...e.workout_sets.map(s=>Number(s.weight)));
   latest.sets+=e.workout_sets.length;
   latest.reps+=e.workout_sets.reduce((n,s)=>n+s.reps,0);
   values.set(w.performed_at,latest);
  }
 }
 return [...values.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
export function exerciseIds(workouts:readonly Workout[]):string[]{
 return [...new Set(workouts.flatMap(w=>w.workout_entries
  .filter(e=>e.workout_sets.length>0).map(e=>e.exercise_id)))].sort();
}