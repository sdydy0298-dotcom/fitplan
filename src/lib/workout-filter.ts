import type {Workout} from './types';
import {dateISO,fmtDate} from './format';
export type WorkoutFilter={query:string;period:string;routine:string;order:string;from:string;to:string};
export function filterWorkoutHistory(
 workouts:readonly Workout[],filter:WorkoutFilter,
 routineTitles:ReadonlyMap<string,string>,nameOf:(id:string)=>string,today=dateISO()
):Workout[]{
 let start='';
 if(['7','30','90'].includes(filter.period)){
  const d=new Date(today+'T12:00:00');
  d.setDate(d.getDate()-Number(filter.period)+1);
  start=dateISO(d);
 }else if(filter.period==='custom')start=filter.from;
 const end=filter.period==='custom'?filter.to:today;
 const q=filter.query.trim().toLocaleLowerCase('ko-KR');
 return workouts.filter(w=>{
  if(start&&w.performed_at<start)return false;
  if(end&&w.performed_at>end)return false;
  if(filter.routine==='free'&&w.routine_id!==null)return false;
  if(filter.routine!=='free'&&filter.routine!=='all'&&w.routine_id!==filter.routine)return false;
  if(!q)return true;
  const exercises=w.workout_entries.map(e=>nameOf(e.exercise_id)).join(' ');
  const value=[w.performed_at,fmtDate(w.performed_at),w.notes||'',
   w.routine_id?routineTitles.get(w.routine_id)||'':'자유 운동',exercises]
   .join(' ').toLocaleLowerCase('ko-KR');
  return value.includes(q);
 }).sort((a,b)=>(filter.order==='old'
  ?a.performed_at.localeCompare(b.performed_at)
  :b.performed_at.localeCompare(a.performed_at))||
  (filter.order==='old'?a.created_at.localeCompare(b.created_at)
  :b.created_at.localeCompare(a.created_at)));
}