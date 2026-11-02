import {browserDb} from './supabase';
import type {Routine,Workout} from './types';
export async function loadRoutines():Promise<Routine[]> {
 const {data,error}=await browserDb().from('routines').select('id,owner_id,title,description,created_at,updated_at,routine_days(id,weekday,position,routine_items(id,exercise_id,position,target_sets,target_reps,target_weight,notes))').order('updated_at',{ascending:false});
 if(error)throw error;
 return (data??[]) as Routine[];
}
export async function loadRoutine(id:string):Promise<Routine|null>{
 const {data,error}=await browserDb().from('routines').select('id,owner_id,title,description,created_at,updated_at,routine_days(id,weekday,position,routine_items(id,exercise_id,position,target_sets,target_reps,target_weight,notes))').eq('id',id).maybeSingle();
 if(error)throw error;return data as Routine|null;
}
export async function loadWorkouts():Promise<Workout[]>{
 const {data,error}=await browserDb().from('workout_sessions').select('id,user_id,routine_id,performed_at,notes,created_at,workout_entries(id,exercise_id,position,workout_sets(id,set_no,reps,weight))').order('performed_at',{ascending:false});
 if(error)throw error;return (data??[]) as Workout[];
}
export async function loadWorkout(id:string):Promise<Workout|null>{
 const {data,error}=await browserDb().from('workout_sessions').select('id,user_id,routine_id,performed_at,notes,created_at,workout_entries(id,exercise_id,position,workout_sets(id,set_no,reps,weight))').eq('id',id).maybeSingle();
 if(error)throw error;return data as Workout|null;
}
export const orderedDays=(routine:Routine)=>[...(routine.routine_days??[])].sort((a,b)=>a.weekday-b.weekday);
export const orderedItems=<T extends {position:number}>(rows:T[])=>[...rows].sort((a,b)=>a.position-b.position);
