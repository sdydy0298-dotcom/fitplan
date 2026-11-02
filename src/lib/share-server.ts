import 'server-only';
import {adminDb} from './admin';
import type {ShareRoutine} from './types';

// Server-side only: returns strictly whitelisted shared content.
export async function getPublicRoutine(token:string):Promise<ShareRoutine|null>{
 const admin=adminDb();
 const {data:share,error:shareError}=await admin.from('routine_shares').select('routine_id').eq('token',token).eq('active',true).maybeSingle();
 if(shareError)throw shareError;
 if(!share)return null;
 const {data:r,error:rError}=await admin.from('routines').select('id,title,description').eq('id',share.routine_id).maybeSingle();
 if(rError)throw rError;
 if(!r)return null;
 const {data:days,error:dError}=await admin.from('routine_days').select('id,weekday,position').eq('routine_id',r.id).order('position');
 if(dError)throw dError;
 const dayIds=(days||[]).map(d=>d.id);
 const {data:rows,error:iError}=dayIds.length?await admin.from('routine_items').select('routine_day_id,exercise_id,position,target_sets,target_reps,target_weight,notes').in('routine_day_id',dayIds).order('position'):{data:[],error:null};
 if(iError)throw iError;
 return {title:r.title,description:r.description,routine_days:(days||[]).map(d=>({weekday:d.weekday,position:d.position,routine_items:(rows||[]).filter(i=>i.routine_day_id===d.id).map(i=>({exercise_id:i.exercise_id,position:i.position,target_sets:i.target_sets,target_reps:i.target_reps,target_weight:Number(i.target_weight),notes:i.notes}))}))};
}
