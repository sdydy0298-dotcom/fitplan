import type {Workout} from './types';

/**
 * A logged set is immutable in "continue workout" mode. Previously saved
 * sessions stay in the database; only newly checked sets are inserted.
 * To change a saved set, use that session's existing edit page.
 */
export type ResumeSet={
 key:string;reps:number;weight:number;done:boolean;saved:boolean;
 sourceWorkoutId?:string;
};
export type ResumeEntry={key:string;exercise_id:string;sets:ResumeSet[]};
export type PlannedExercise={
 exercise_id:string;target_sets:number;target_reps:number;target_weight:number;
};
export type ExerciseProgress={
 exercise_id:string;targetSets:number;completedSets:number;pendingSets:number;
};
const makeKey=()=>crypto.randomUUID();
export const freshSet=(reps=10,weight=0):ResumeSet=>({
 key:makeKey(),reps,weight,done:false,saved:false
});
export const freshEntry=(exercise_id:string,sets=3,reps=10,weight=0):ResumeEntry=>({
 key:makeKey(),exercise_id,sets:Array.from({length:sets},()=>freshSet(reps,weight))
});

export function savedByExercise(records:readonly Workout[]):Map<string,ResumeSet[]>{
 const result=new Map<string,ResumeSet[]>();
 const ordered=[...records].sort((a,b)=>a.created_at.localeCompare(b.created_at));
 for(const workout of ordered){
  for(const item of [...(workout.workout_entries||[])].sort((a,b)=>a.position-b.position)){
   const group=result.get(item.exercise_id)||[];
   for(const set of [...(item.workout_sets||[])].sort((a,b)=>a.set_no-b.set_no)){
    group.push({
     key:makeKey(),reps:set.reps,weight:Number(set.weight),
     done:true,saved:true,sourceWorkoutId:workout.id
    });
   }
   result.set(item.exercise_id,group);
  }
 }
 return result;
}

/** Include every saved set, including sets exceeding current targets and
 * exercises added outside the plan. Never fabricate completion for pending sets.
 */
export function buildResumeEntries(
 planned:readonly PlannedExercise[],records:readonly Workout[]
):ResumeEntry[]{
 const goals=new Map<string,{sets:number;reps:number;weight:number}>();
 for(const item of planned){
  const goal=goals.get(item.exercise_id);
  if(goal)goal.sets+=item.target_sets;
  else goals.set(item.exercise_id,{
   sets:item.target_sets,reps:item.target_reps,weight:Number(item.target_weight)
  });
 }
 const saved=savedByExercise(records);
 const ids=[...new Set([...goals.keys(),...saved.keys()])];
 return ids.map(id=>{
  const goal=goals.get(id),complete=saved.get(id)||[];
  const pending=Math.max(0,(goal?.sets||0)-complete.length);
  return {
   key:makeKey(),exercise_id:id,
   sets:[
    ...complete,
    ...Array.from({length:pending},()=>freshSet(goal?.reps??10,goal?.weight??0))
   ]
  };
 });
}

/** The edit page edits an existing workout directly. Continue mode uses this
 * payload to append only NEW sets, so existing sessions are not duplicated.
 */
export function newCompletedEntries(entries:readonly ResumeEntry[]){
 return entries.map(e=>({
  exercise_id:e.exercise_id,
  sets:e.sets.filter(s=>s.done&&!s.saved)
   .map(s=>({reps:s.reps,weight:s.weight}))
 })).filter(e=>e.sets.length>0);
}

export function summarizeExercises(
 planned:readonly PlannedExercise[],records:readonly Workout[]
):ExerciseProgress[]{
 const targetMap=new Map<string,number>();
 for(const p of planned){
  targetMap.set(p.exercise_id,(targetMap.get(p.exercise_id)||0)+p.target_sets);
 }
 const actual=savedByExercise(records);
 return [...targetMap.entries()].map(([exercise_id,targetSets])=>{
  const completedSets=Math.min(targetSets,actual.get(exercise_id)?.length||0);
  return {exercise_id,targetSets,completedSets,pendingSets:targetSets-completedSets};
 });
}
