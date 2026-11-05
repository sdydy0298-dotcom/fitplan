import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const format={dateISO:(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),fmtDate:(d)=>d};
const shiftDate=(iso,n)=>{const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const mondayOf=(iso)=>shiftDate(iso,-((new Date(iso+'T12:00:00Z').getUTCDay()+6)%7));
const planner={mondayOf,shiftDate};
function load(source,requires){
 const compiled=ts.transpileModule(fs.readFileSync(new URL(source,import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
 }).outputText;
 const exports={},context={module:{exports},exports,require:p=>{
  if(!(p in requires))throw Error('Unknown mock '+p);return requires[p]
 }};
 vm.runInNewContext(compiled,context,{filename:source});
 return context.module.exports;
}
const cal=load('../src/lib/monthly-calendar.ts',{'./planner':planner,'./format':format});
const analytics=load('../src/lib/analytics.ts',{
 './planner':planner,'./format':format,'./monthly-calendar':cal
});
const filters=load('../src/lib/workout-filter.ts',{'./format':format});
const items=(exercise_id,target_sets)=>({key:exercise_id,exercise_id,target_sets,target_reps:10,target_weight:25,notes:''});
const original=Array.from({length:7},(_,weekday)=>({
 weekday,items:[1,2,4,5].includes(weekday)?[items('bench-press',weekday===5?2:3)]:[]
}));
const current=original.map(d=>({
 weekday:d.weekday,items:[1,2].includes(d.weekday)?[]:d.items
}));
const version={
 id:'v',user_id:'u',routine_id:'routine',routine_title:'4분할',
 effective_week:'2026-11-02',started_on:'2026-11-05',
 created_at:'2026-11-05T01:00:00Z',reason:'activation',days:original
};
const plan={
 id:'w',user_id:'u',week_start:'2026-11-02',routine_id:'routine',routine_title:'4분할',
 created_at:'2026-11-05T02:00:00Z',updated_at:'2026-11-05T02:00:00Z',days:current
};
const workout=(id,date,exercise,count,weight)=>({
 id,performed_at:date,created_at:'2026-11-05T04:00:00Z',routine_id:'routine',
 workout_entries:[{
  id:id+'e',exercise_id:exercise,position:0,
  workout_sets:Array.from({length:count},(_,i)=>({id:id+'s'+i,set_no:i+1,reps:10,weight}))
 }]
});
const workouts=[
 workout('a','2026-11-05','bench-press',1,25),
 workout('b','2026-11-05','bench-press',1,30)
];
assert.equal(cal.monthDates('2026-11').length,42);
assert.equal(cal.monthDates('2026-11')[0],'2026-10-26');
assert.equal(cal.nextMonth('2026-12',1),'2027-01');
assert.equal(cal.nextMonth('2026-01',-1),'2025-12');
const month=cal.makeMonth('2026-11',workouts,[plan],[version],'2026-11-05');
const day=n=>month.days.find(d=>d.date==='2026-11-'+String(n).padStart(2,'0'));
assert.equal(day(2).status,'not-started');
assert.equal(day(3).status,'not-started');
assert.equal(day(4).status,'rest');
assert.equal(day(5).status,'partial');
assert.equal(day(5).completedSets,2);
assert.equal(day(5).plannedSets,3);
assert.equal(day(5).recordedSets,2);
assert.equal(day(6).status,'upcoming');
assert.equal(day(9).status,'upcoming');
assert.equal(month.workoutDays,1);
assert.equal(month.partialDays,1);
const afterDelete=cal.makeMonth('2026-11',[],[plan],[version],'2026-11-06');
assert.equal(afterDelete.days.find(d=>d.date==='2026-11-05').status,'missed');
const weeks=analytics.weeklyTrend(workouts,[plan],[version],2,'2026-11-05');
assert.equal(weeks.length,2);
assert.equal(weeks[0].adherence,null);
assert.equal(weeks[1].sets,2);
assert.equal(weeks[1].days,1);
assert.equal(weeks[1].plannedSets,5);
assert.equal(weeks[1].completedSets,2);
assert.equal(weeks[1].adherence,40);
const weights=analytics.weightHistory(workouts,'bench-press');
assert.equal(weights.length,1);
assert.equal(weights[0].best,30);
assert.equal(weights[0].sets,2);
assert.equal(weights[0].reps,20);
assert.equal(JSON.stringify(analytics.exerciseIds(workouts)),JSON.stringify(['bench-press']));

const freeWorkout={...workouts[0],id:'free',routine_id:null,performed_at:'2026-10-10',created_at:'2026-10-10T00:00:00Z'};
const defaults={query:'',period:'all',routine:'all',order:'new',from:'',to:''};
const titles=new Map([['routine','4분할']]);
const exerciseName=id=>id==='bench-press'?'바벨 벤치프레스':id;
const filter=(values,patch)=>filters.filterWorkoutHistory(values,{...defaults,...patch},titles,exerciseName,'2026-11-05');
const all=filter([...workouts,freeWorkout],{});
assert.equal(all.length,3);
assert.equal(all[0].performed_at,'2026-11-05');
assert.equal(filter(all,{routine:'free'}).length,1);
assert.equal(filter(all,{routine:'routine'}).length,2);
assert.equal(filter(all,{query:'벤치'}).length,3);
assert.equal(filter(all,{query:'4분할'}).length,2);
assert.equal(filter(all,{query:'알수없는종목'}).length,0);
assert.equal(filter(all,{period:'7'}).length,2);
assert.equal(filter(all,{period:'custom',from:'2026-10-01',to:'2026-10-31'}).length,1);
assert.equal(filter(all,{order:'old'})[0].id,'free');
console.log('PASS: search, custom date filters, free-routine selector and sorting');
console.log('PASS: 42-day calendar, activation boundaries, edit-independent projections, monthly attendance, weekly trend and merged exercise records');
