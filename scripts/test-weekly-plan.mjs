import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code=fs.readFileSync(new URL('../src/lib/weekly-plan.ts',import.meta.url),'utf8');
const out=ts.transpileModule(code,{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
let serial=0;
const localISO=(date=new Date())=>{
 const d=date;return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
};
const shift=(iso,offset)=>{
 const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+offset);return localISO(d);
};
const monday=(iso)=>shift(iso,-((new Date(iso+'T12:00:00').getDay()+6)%7));
const versions=[];
const weekRows=[];
const db={
 auth:{getUser:async()=>({data:{user:{id:'test-member'}},error:null})},
 from(name){
  if(name==='plan_versions')return {
   insert:async rows=>{versions.push(...(Array.isArray(rows)?rows:[rows]));return {error:null};},
   select(){return this;},
   lte(_field,week){this.week=week;return this;},
   order(){return this;},
   limit(){return this;},
   async maybeSingle(){
    const values=versions.filter(v=>v.effective_week<=this.week);
    values.sort((a,b)=>b.effective_week.localeCompare(a.effective_week));
    return {data:values[0]||null,error:null};
   }
  };
  if(name==='weekly_plans')return {
   select(){return this;},
   eq(_field,week){this.week=week;return this;},
   async maybeSingle(){return {data:weekRows.find(x=>x.week_start===this.week)||null,error:null};},
   upsert(record){return {
    select(){return this;},
    async single(){weekRows.push(record);return {data:record,error:null};}
   };},
   insert(record){return {
    select(){return this;},
    async single(){weekRows.push(record);return {data:record,error:null};}
   };}
  };
  throw new Error('Unexpected table '+name);
 }
};
const bindings={
 './supabase':{browserDb:()=>db},
 './planner':{mondayOf:monday,shiftDate:shift},
 './format':{dateISO:localISO}
};
const exports={};
const context={exports,module:{exports},crypto:{randomUUID:()=>String(++serial)},
 require:name=>{if(!(name in bindings))throw new Error(name);return bindings[name];}};
vm.runInNewContext(out,context,{filename:'weekly-plan.js'});
const {startRoutine,getWeekPlan,snapshotRoutine}=context.module.exports;
const routine={
 id:'routine-1',title:'주 3회',
 routine_days:[1,3,5].map((weekday,position)=>({
  id:'day-'+weekday,weekday,position,
  routine_items:[{
   id:'item-'+weekday,position:0,exercise_id:'bench-press',
   target_sets:3,target_reps:10,target_weight:50,notes:null
  }]
 }))
};
const snapshot=snapshotRoutine(routine);
assert.equal(snapshot.length,7);
assert.equal(snapshot[1].items.length,1);
assert.equal(snapshot[2].items.length,0);
const current=await startRoutine(routine,'2026-11-04');
assert.equal(versions.length,2);
assert.equal(versions[0].effective_week,'2026-11-02');
assert.equal(versions[1].effective_week,'2026-11-09');
assert.equal(current.days[1].items.length,0); // Monday before activation was not missed
assert.equal(current.days[3].items.length,1); // Wednesday is the start day
assert.equal(current.days[5].items.length,1); // Friday still scheduled
const notPrebuilt=await getWeekPlan('2026-11-09','2026-11-04');
assert.equal(notPrebuilt,null);
const repeated=await getWeekPlan('2026-11-09','2026-11-09');
assert.equal(repeated.days[1].items.length,1); // normal Monday next week
assert.equal(repeated.days[3].items.length,1);
assert.equal(repeated.routine_title,'주 3회');
assert.equal(weekRows.length,2);
console.log('PASS: activation, no retroactive missed days, next-week repetition and lazy snapshots');
