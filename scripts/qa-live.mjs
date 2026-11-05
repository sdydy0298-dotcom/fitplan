/**
 * FITPLAN live integration QA. Intentionally opt-in; creates synthetic users.
 *
 * RUN_LIVE_QA=1 SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... node scripts/qa-live.mjs
 *
 * Uses reserved example.com addresses, never real personal details. The script
 * creates actual Supabase Auth test users and records. Delete only QA accounts
 * identified in the output after the evidence has been collected.
 */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

if(process.env.RUN_LIVE_QA!=='1')throw new Error('Explicit opt-in RUN_LIVE_QA=1 required');
const root=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const key=process.env.SUPABASE_PUBLISHABLE_KEY||'';
const site=(process.env.SITE_URL||'https://sdy-fitplan.vercel.app').replace(/\/$/,'');
if(!root.startsWith('https://')||!key||!site.startsWith('https://'))throw new Error('Missing public URL/key');
const suffix=Date.now().toString(36)+'-'+randomUUID().slice(0,5);
const accounts=[
 {email:'qa-fitplan-a-'+suffix+'@example.com',password:'QA-v2-'+randomUUID()+'$a'},
 {email:'qa-fitplan-b-'+suffix+'@example.com',password:'QA-v2-'+randomUUID()+'$b'}
];
const results=[];
function log(name,status,data=''){
 results.push({name,status,detail:String(data).slice(0,220)});
 console.log(status+' '+name+(data?' :: '+String(data).slice(0,170):''));
}
async function edge(action,account,override={}){
 const response=await fetch(root+'/functions/v1/fitplan-register',{
  method:'POST',
  headers:{'content-type':'application/json',apikey:key,Authorization:'Bearer '+key,Origin:site},
  body:JSON.stringify({action,email:account.email,password:account.password,...override})
 });
 const content=await response.json();
 return {status:response.status,content,headers:response.headers};
}
const db=()=>createClient(root,key,{db:{schema:'fitplan'},auth:{persistSession:false,autoRefreshToken:false}});
async function ok(promise,label){
 const r=await promise;
 if(r.error)throw Error(label+': '+r.error.code+' '+r.error.message);
 return r.data;
}
try{
 const unauth=db();
 const noRoutines=await unauth.from('routines').select('id').limit(3);
 assert.equal(noRoutines.data?.length,0);
 log('Anonymous workout routines blocked','PASS');

 const identity=[];
 for(const [i,a] of accounts.entries()){
  const res=await edge('register-v2',a);
  assert.equal(res.status,200,JSON.stringify(res.content));
  assert.equal(res.content.ok,true);
  log('Register synthetic account '+(i+1),'PASS');
  const wrong=await edge('login-v2',a,{password:'Wrong-password-99'});
  assert.equal(wrong.status,401);
  log('Wrong password rejected '+(i+1),'PASS');
  const signed=await edge('login-v2',a);
  assert.equal(signed.status,200,JSON.stringify(signed.content));
  assert.ok(signed.content.access_token);
  const client=db();
  const session=await client.auth.setSession({
   access_token:signed.content.access_token,
   refresh_token:signed.content.refresh_token
  });
  if(session.error)throw session.error;
  const user=await client.auth.getUser();
  assert.ok(user.data.user?.id);
  identity.push({userId:user.data.user.id,client});
  log('FITPLAN session created '+(i+1),'PASS');
 }
 const dup=await edge('register-v2',accounts[0]);
 assert.equal(dup.status,409);
 log('Duplicate FITPLAN registration rejected','PASS');
 const A=identity[0],B=identity[1];
 const catalog=await ok(A.client.from('exercise_catalog').select('id').eq('id','bench-press'),'Exercise catalog');
 assert.equal(catalog.length,1);
 log('Exercise catalog accessible','PASS');

 const schedule=[
  {weekday:1,items:[{exercise_id:'bench-press',target_sets:3,target_reps:10,target_weight:40,notes:'QA Monday'}]},
  {weekday:3,items:[{exercise_id:'lat-pulldown',target_sets:3,target_reps:10,target_weight:30,notes:'QA Wednesday'}]},
  {weekday:5,items:[{exercise_id:'back-squat',target_sets:3,target_reps:10,target_weight:50,notes:'QA Friday'}]}
 ];
 const routineId=await ok(A.client.rpc('save_routine',{
  p_id:null,p_title:'QA 자동검증 주 3회 '+suffix,p_description:'자동 검증 - 실제 개인 데이터 아님',
  p_days:schedule
 }),'Create routine');
 assert.ok(routineId);
 log('Create routine and exercise days','PASS',routineId);
 const rA=await ok(A.client.from('routines').select('id,title,routine_days(id,weekday,routine_items(exercise_id,target_sets))').eq('id',routineId).single(),'Read own routine');
 assert.equal(rA.routine_days.length,3);
 const visibleB=await ok(B.client.from('routines').select('id').eq('id',routineId),'RLS routine');
 assert.equal(visibleB.length,0);
 log('RLS prevents account B reading A routine','PASS');
 const ownerB=await B.client.from('routines').update({title:'TRY unauthorized mutation'}).eq('id',routineId).select();
 assert.equal(ownerB.data?.length,0);
 log('RLS prevents account B updating A routine','PASS');

 const monday=(iso)=>{
  const d=new Date(iso+'T12:00:00Z');
  d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
  return d.toISOString().slice(0,10);
 };
 const today=new Date().toISOString().slice(0,10);
 const week=monday(today);
 const dateAdd=(iso,n)=>{const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
 const days=Array.from({length:7},(_,weekday)=>({
  weekday,items:(schedule.find(x=>x.weekday===weekday)?.items||[]).map(x=>({
   ...x,key:randomUUID()
  }))
 }));
 const versions=await ok(A.client.from('plan_versions').insert([
  {user_id:A.userId,routine_id:routineId,routine_title:rA.title,effective_week:week,started_on:today,days,reason:'activation'},
  {user_id:A.userId,routine_id:routineId,routine_title:rA.title,effective_week:dateAdd(week,7),started_on:dateAdd(week,7),days,reason:'activation'}
 ]).select('id,effective_week'),'Activate routine');
 assert.equal(versions.length,2);
 log('Activate weekly routine and next-week repetition','PASS');
 const currentDays=days.map(d=>({
  ...d,items:dateAdd(week,(d.weekday+6)%7)<today?[]:d.items
 }));
 const weekly=await ok(A.client.from('weekly_plans').insert({
  user_id:A.userId,week_start:week,routine_id:routineId,routine_title:rA.title,days:currentDays
 }).select('id,updated_at,days').single(),'Create weekly snapshot');
 assert.ok(weekly.id);
 log('Persist current week plan snapshot','PASS');
 const prior=JSON.stringify(weekly.days);
 const wed=currentDays.find(d=>d.weekday===3);
 wed.items.push({key:randomUUID(),exercise_id:'dumbbell-curl',target_sets:2,target_reps:12,target_weight:6,notes:'QA extra this week'});
 const saved=await ok(A.client.from('weekly_plans').update({
  days:currentDays,updated_at:new Date().toISOString()
 }).eq('id',weekly.id).eq('updated_at',weekly.updated_at)
 .select('days').single(),'Edit weekly snapshot');
 assert.notEqual(JSON.stringify(saved.days),prior);
 const untouched=await ok(A.client.from('plan_versions').select('days').eq('effective_week',dateAdd(week,7)).maybeSingle(),'Read next-week template');
 assert.ok(untouched.days.find(d=>d.weekday===3).items.length===1);
 log('Week-only extra exercise does not alter next week','PASS');
 const Bplan=await ok(B.client.from('weekly_plans').select('id').eq('id',weekly.id),'RLS week');
 assert.equal(Bplan.length,0);
 log('RLS blocks B from A weekly plan','PASS');

 const actualDate=(day)=>{
  const d=dateAdd(week,(day+6)%7);
  return d>today?today:d;
 };
 // Recording a partial exercise: only one set completed; plan remains unchanged.
 const performed=actualDate(3);
 const workoutId=await ok(A.client.rpc('save_workout',{
  p_id:null,p_date:performed,p_routine_id:routineId,p_notes:'QA completed 1 of 3 sets',
  p_entries:[{exercise_id:'lat-pulldown',sets:[{reps:10,weight:30}]}]
 }),'Save partial workout');
 assert.ok(workoutId);
 const sessions=await ok(A.client.from('workout_sessions')
  .select('id,workout_entries(exercise_id,workout_sets(reps,weight))')
  .eq('id',workoutId).single(),'Read partial workout');
 assert.equal(sessions.workout_entries.length,1);
 assert.equal(sessions.workout_entries[0].workout_sets.length,1);
 log('Save only performed set and read nested workout','PASS',workoutId);
 const Bworkout=await ok(B.client.from('workout_sessions').select('id').eq('id',workoutId),'RLS workouts');
 assert.equal(Bworkout.length,0);
 log('RLS blocks B from A workout records','PASS');

 const token=randomUUID().replaceAll('-','')+randomUUID().replaceAll('-','');
 await ok(A.client.from('routine_shares').insert({
  routine_id:routineId,owner_id:A.userId,token,active:true,revoked_at:null
 }).select('id'),'Share routine');
 const read=await fetch(site+'/api/share/'+token);
 assert.equal(read.status,200,'Share GET '+read.status+' '+await read.text().catch(()=>'?'));
 const detail=await read.json();
 assert.equal(detail.routine.title,rA.title);
 log('Public read-only share endpoint','PASS');
 const unauthedCopy=await fetch(site+'/api/share/'+token+'/copy',{method:'POST'});
 assert.equal(unauthedCopy.status,401);
 log('Anonymous share-copy rejected','PASS');
 const Bearer=await B.client.auth.getSession();
 const access=Bearer.data.session.access_token;
 const clone=await fetch(site+'/api/share/'+token+'/copy',{
  method:'POST',headers:{Authorization:'Bearer '+access}
 });
 const payload=await clone.json();
 assert.equal(clone.status,200,JSON.stringify(payload));
 assert.ok(payload.id);
 const cloneRoutine=await ok(B.client.from('routines').select('id,title').eq('id',payload.id).single(),'Copied routine');
 assert.equal(cloneRoutine.title,rA.title);
 log('Account B copies public routine to its own private account','PASS',payload.id);
 const AcanSeeClone=await ok(A.client.from('routines').select('id').eq('id',payload.id),'RLS reverse');
 assert.equal(AcanSeeClone.length,0);
 log('Copied routine privately owned by B','PASS');

 // No TEST account deletion here: evidence/cleanup is performed by a separate
 // exact-match SQL operation after this script finishes.
 console.log('QA_IDENTITIES '+JSON.stringify(accounts.map((account,index)=>({
  email:account.email,user_id:identity[index].userId
 }))));
 console.log('QA_RESULT '+JSON.stringify({pass:results.filter(x=>x.status==='PASS').length,total:results.length,results}));
}catch(e){
 console.error('QA_FAIL',e?.stack||e);
 console.log('QA_IDENTITIES '+JSON.stringify(accounts.map(account=>({email:account.email}))));
 process.exitCode=1;
}
