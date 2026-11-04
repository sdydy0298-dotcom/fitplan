import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

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
const items=(exercise_id,target_sets=3)=>({key:exercise_id,exercise_id,target_sets,target_reps:10,target_weight:40,notes:''});
const weekPlan={
 id:'test',week_start:'2026-11-02',routine_id:'routine-a',routine_title:'주 3회 운동',
 days:Array.from({length:7},(_,weekday)=>({
  weekday,items:[1,3,5].includes(weekday)?[items('squat'),items('bench')]:[]
 }))
};
const workout=(date,routine_id='routine-a',exercise='squat',sets=3)=>({
 performed_at:date,routine_id,workout_entries:[{
  exercise_id:exercise,workout_sets:Array.from({length:sets},(_,i)=>({reps:10,weight:40,set_no:i+1}))
 }]
});
const day=(week,date)=>week.days.find(x=>x.date===date);
assert.equal(mondayOf('2026-11-05'),'2026-11-02');
assert.equal(shiftDate('2026-12-31',1),'2027-01-01');
const empty=calculatePlannerWeek(weekPlan,[],'2026-11-05');
assert.equal(empty.planned,3);
assert.equal(empty.completed,0);
assert.equal(empty.missed,2);
assert.equal(empty.remaining,1);
assert.equal(empty.percentage,0);
assert.equal(day(empty,'2026-11-03').status,'rest');
assert.equal(day(empty,'2026-11-04').status,'missed');
assert.equal(day(empty,'2026-11-06').status,'upcoming');

const partial=calculatePlannerWeek(weekPlan,[workout('2026-11-02')],'2026-11-05');
assert.equal(partial.completed,0);
assert.equal(partial.partial,1);
assert.equal(partial.completedSets,3);
assert.equal(partial.plannedSets,18);
assert.equal(partial.percentage,17);
assert.equal(day(partial,'2026-11-02').status,'partial');

const all=calculatePlannerWeek(weekPlan,[
 workout('2026-11-02'),workout('2026-11-02','routine-a','bench',3),
 workout('2026-11-04'),workout('2026-11-04','routine-a','bench',3)
 ],'2026-11-05');
assert.equal(all.completed,2);
assert.equal(all.missed,0);
assert.equal(all.percentage,67);
assert.equal(day(all,'2026-11-02').status,'done');

const deleted=calculatePlannerWeek(weekPlan,[],'2026-11-05');
assert.equal(deleted.completed,0);
assert.equal(deleted.missed,2);

const freestyle=calculatePlannerWeek(weekPlan,[workout('2026-11-03',null)],'2026-11-05');
assert.equal(day(freestyle,'2026-11-03').status,'extra');
assert.equal(freestyle.percentage,0);

const otherRoutine=calculatePlannerWeek(weekPlan,[workout('2026-11-02','other')],'2026-11-05');
assert.equal(day(otherRoutine,'2026-11-02').status,'missed');

const futureLog=calculatePlannerWeek(weekPlan,[workout('2026-11-06')],'2026-11-05');
assert.equal(day(futureLog,'2026-11-06').status,'upcoming');
assert.equal(futureLog.completedSets,0);

const capped=calculatePlannerWeek(weekPlan,[workout('2026-11-02','routine-a','squat',15)],'2026-11-05');
assert.equal(capped.completedSets,3);

const noActive=calculatePlannerWeek(null,[workout('2026-11-02','routine-a')],'2026-11-05');
assert.equal(noActive.planned,0);
assert.equal(noActive.percentage,0);
assert.equal(day(noActive,'2026-11-02').status,'extra');
console.log('PASS: active routine snapshots, set-level partial completion, missed dates, free training, caps, and future protection');
