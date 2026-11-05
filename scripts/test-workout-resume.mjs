import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {randomUUID} from 'node:crypto';

const src=fs.readFileSync(new URL('../src/lib/workout-resume.ts',import.meta.url),'utf8');
const code=ts.transpileModule(src,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
}}).outputText;
const exports={};
const context={
 exports,module:{exports},crypto:{randomUUID}
};
vm.runInNewContext(code,context,{filename:'workout-resume.js'});
const {buildResumeEntries,newCompletedEntries,summarizeExercises}=context.module.exports;
const makeWorkout=(id,created_at,exercise,sets)=>({
 id,created_at,performed_at:'2026-11-05',routine_id:'routine-1',
 workout_entries:[{
  id:id+'-entry',exercise_id:exercise,position:0,
  workout_sets:Array.from({length:sets},(_,i)=>({
   set_no:i+1,reps:10+i,weight:20+i
  }))
 }]
});
const previous=[
 makeWorkout('first','2026-11-05T03:00:04Z','overhead-press',3),
 makeWorkout('second','2026-11-05T03:00:11Z','overhead-press',3),
 makeWorkout('third','2026-11-05T03:00:19Z','seated-row',4),
];
const goals=[
 {exercise_id:'overhead-press',target_sets:3,target_reps:10,target_weight:15},
 {exercise_id:'seated-row',target_sets:4,target_reps:10,target_weight:25},
 {exercise_id:'lat-pulldown',target_sets:3,target_reps:12,target_weight:30}
];
const resumed=buildResumeEntries(goals,previous);
assert.equal(resumed.length,3);
assert.equal(resumed[0].sets.length,6);
assert.equal(resumed[0].sets.filter(s=>s.done&&s.saved).length,6);
assert.deepEqual(resumed[0].sets.map(s=>s.reps),[10,11,12,10,11,12]);
assert.equal(resumed[1].sets.filter(s=>s.saved).length,4);
assert.equal(resumed[2].sets.length,3);
assert.equal(resumed[2].sets.filter(s=>s.done).length,0);
assert.equal(newCompletedEntries(resumed).length,0,
 'Reopening an already-recorded workout must never duplicate the saved sets');
const summary=summarizeExercises(goals,previous);
assert.equal(summary[0].completedSets,3,'Extra sets cannot exceed plan target');
assert.equal(summary[1].completedSets,4);
assert.equal(summary[2].completedSets,0);

resumed[2].sets[0].done=true;
resumed[2].sets[0].reps=12;
resumed[2].sets[0].weight=30;
const additional=newCompletedEntries(resumed);
assert.equal(additional.length,1);
assert.equal(additional[0].exercise_id,'lat-pulldown');
assert.equal(additional[0].sets.length,1);
assert.equal(additional[0].sets[0].reps,12);
assert.equal(resumed.reduce((sum,e)=>sum+e.sets.filter(s=>s.saved).length,0),10);

const blank=buildResumeEntries(goals,[]);
assert.equal(blank.length,3);
assert.equal(blank.reduce((n,e)=>n+e.sets.filter(s=>s.done).length,0),0);
const extra=buildResumeEntries([{exercise_id:'lat-pulldown',target_sets:2,target_reps:10,target_weight:20}],
 [makeWorkout('extra','2026-11-05T03:00:00Z','dumbbell-curl',2)]);
assert.equal(extra.length,2);
assert.equal(extra[1].exercise_id,'dumbbell-curl');
assert.equal(extra[1].sets.filter(s=>s.saved).length,2);
assert.equal(newCompletedEntries(extra).length,0);
console.log('PASS: resume 3 saved sessions checked, preserve existing sets, append only new work, exercise summaries and extra exercises');
