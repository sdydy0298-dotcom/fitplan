import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real TypeScript planner module without a browser or DB.
const source=fs.readFileSync(new URL('../src/lib/planner.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020
}}).outputText;
const dateISO=(d=new Date())=>
 d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const exports={};
const context={exports,module:{exports},require:(name)=>{
 if(name!=='./format')throw new Error('Unknown module '+name);
 return {dateISO};
}};
vm.runInNewContext(compiled,context,{filename:'planner.js'});
const {calculatePlannerWeek,shiftDate,mondayOf}=context.module.exports;

const baseRoutine={
 id:'routine-a',title:'주 3회 근력 운동',created_at:'2026-10-01T12:00:00Z',
 routine_days:[1,3,5].map(weekday=>({weekday,routine_items:[{exercise_id:'squat'}]}))
};
const workout=(date,routine_id='routine-a',hasSets=true)=>({
 id:date+routine_id,performed_at:date,routine_id,
 workout_entries:[{exercise_id:'squat',workout_sets:hasSets?[{reps:10,weight:20}]:[]}]
});
const byDate=(week,date)=>week.days.find(day=>day.date===date);

assert.equal(mondayOf('2026-11-05'),'2026-11-02');
assert.equal(shiftDate('2026-12-31',1),'2027-01-01');
const mondayDone=calculatePlannerWeek([baseRoutine],[workout('2026-11-02')],'2026-11-05');
assert.equal(mondayDone.planned,3);
assert.equal(mondayDone.completed,1);
assert.equal(mondayDone.missed,1);
assert.equal(mondayDone.remaining,1);
assert.equal(mondayDone.percentage,33);
assert.equal(byDate(mondayDone,'2026-11-02').status,'done');
assert.equal(byDate(mondayDone,'2026-11-04').status,'missed');
assert.equal(byDate(mondayDone,'2026-11-06').status,'upcoming');
assert.equal(byDate(mondayDone,'2026-11-03').status,'rest');

const withFree=calculatePlannerWeek([baseRoutine],
 [workout('2026-11-02'),workout('2026-11-03',null)],'2026-11-05');
assert.equal(withFree.completed,1);
assert.equal(byDate(withFree,'2026-11-03').status,'extra');

const withTwo=calculatePlannerWeek([baseRoutine],
 [workout('2026-11-02'),workout('2026-11-04')],'2026-11-05');
assert.equal(withTwo.completed,2);
assert.equal(withTwo.missed,0);
assert.equal(withTwo.percentage,67);

const futureEntry=calculatePlannerWeek([baseRoutine],
 [workout('2026-11-06')],'2026-11-05');
assert.equal(futureEntry.completed,0);
assert.equal(byDate(futureEntry,'2026-11-06').status,'upcoming');

const removed=calculatePlannerWeek([baseRoutine],[],'2026-11-05');
assert.equal(removed.completed,0);
assert.equal(removed.missed,2);
assert.equal(removed.percentage,0);

const emptySet=calculatePlannerWeek([baseRoutine],[workout('2026-11-02','routine-a',false)],'2026-11-05');
assert.equal(emptySet.completed,0);

const newRoutine={...baseRoutine,created_at:'2026-11-04T12:00:00Z'};
const onlyAfterCreated=calculatePlannerWeek([newRoutine],[],'2026-11-05');
assert.equal(onlyAfterCreated.planned,2);
assert.equal(onlyAfterCreated.missed,1);
assert.equal(byDate(onlyAfterCreated,'2026-11-02').status,'rest');

const none=calculatePlannerWeek([],[],'2026-11-05');
assert.equal(none.planned,0);
assert.equal(none.percentage,0);

console.log('PASS: weekly planner date boundaries, recorded/missed/future, free workouts, completion %, and new-routine start');
