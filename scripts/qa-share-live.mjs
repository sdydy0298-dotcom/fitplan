import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
if(process.env.RUN_LIVE_QA!=='1')throw Error('Requires RUN_LIVE_QA=1');
const base=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_PUBLISHABLE_KEY;
const site=process.env.SITE_URL||'https://sdy-fitplan.vercel.app';
const token=process.env.QA_SHARE_TOKEN;
if(!base||!key||!token||!/^[0-9a-f]{64}$/.test(token))throw Error('Missing public QA configuration/token');
const email='qa-fitplan-share-'+Date.now().toString(36)+'-'+randomUUID().slice(0,5)+'@example.com';
const password='QA-share-'+randomUUID()+'$x';
const post=async(action)=>{const r=await fetch(base+'/functions/v1/fitplan-register',{
 method:'POST',headers:{'content-type':'application/json',apikey:key,authorization:'Bearer '+key,origin:site},
 body:JSON.stringify({action,email,password})
});return {status:r.status,body:await r.json()};};
try {
 const shared=await fetch(site+'/api/share/'+token);
 const payload=await shared.json();
 assert.equal(shared.status,200,JSON.stringify(payload));
 assert.equal(payload.routine.routine_days.length,3);
 console.log('PASS Public shared routine visible without auth');

 const unauth=await fetch(site+'/api/share/'+token+'/copy',{method:'POST'});
 assert.equal(unauth.status,401);
 console.log('PASS Anonymous sharing copy rejected');

 const register=await post('register-v2');
 assert.equal(register.status,200,JSON.stringify(register.body));
 console.log('PASS Register separate sharing test account');

 const logged=await post('login-v2');
 assert.equal(logged.status,200,JSON.stringify(logged.body));
 const access=logged.body.access_token;
 const client=createClient(base,key,{db:{schema:'fitplan'},auth:{persistSession:false,autoRefreshToken:false}});
 const {error:sessionError}=await client.auth.setSession({
  access_token:access,refresh_token:logged.body.refresh_token
 });
 if(sessionError)throw sessionError;
 const {data:{user},error:identityError}=await client.auth.getUser();
 if(identityError||!user)throw identityError||Error('Missing user');
 console.log('PASS Login sharing test account');

 const result=await fetch(site+'/api/share/'+token+'/copy',{
  method:'POST',headers:{authorization:'Bearer '+access}
 });
 const copied=await result.json();
 assert.equal(result.status,200,JSON.stringify(copied));
 const {data:mine,error:cloneError}=await client.from('routines')
  .select('id,title,routine_days(id,weekday,routine_items(exercise_id,target_sets))')
  .eq('id',copied.id).single();
 if(cloneError)throw cloneError;
 assert.ok(mine.title.startsWith(payload.routine.title), 'Copied title should retain source name');
 assert.equal(mine.routine_days.length,3);
 console.log('PASS Copy public routine privately to another member');

 const sourceDays=payload.routine.routine_days;
 const modified=sourceDays.map(d=>({
  weekday:d.weekday,
  items:d.routine_items.map(it=>({
   exercise_id:it.exercise_id,target_sets:it.target_sets,
   target_reps:it.target_reps,target_weight:it.target_weight,notes:it.notes
  }))
 }));
 modified.find(d=>d.weekday===3).items.push({
  exercise_id:'dumbbell-curl',target_sets:2,target_reps:12,target_weight:8,notes:'extra QA'
 });
 const {data:newId,error:editError}=await client.rpc('save_routine',{
  p_id:copied.id,p_title:'QA customized shared workout',
  p_description:'QA copied and edited',p_days:modified
 });
 if(editError)throw editError;
 assert.equal(newId,copied.id);
 const sourceAgain=await fetch(site+'/api/share/'+token);
 assert.equal(sourceAgain.status,200);
 const after=await sourceAgain.json();
 assert.equal(after.routine.title,payload.routine.title);
 assert.equal(after.routine.routine_days.find(d=>d.weekday===3).routine_items.length,
  sourceDays.find(d=>d.weekday===3).routine_items.length);
 console.log('PASS Personalize copied routine; original shared routine unchanged');
 console.log('QA_SHARING_RESULT {"passed":true,"checks":5}');
 console.log('QA_SHARING_IDENTITY '+JSON.stringify({email,user_id:user.id}));
}catch(e){
 console.error('QA_SHARING_FAILED',e?.stack||e);
 console.log('QA_SHARING_IDENTITY '+JSON.stringify({email}));
 process.exitCode=1;
}
