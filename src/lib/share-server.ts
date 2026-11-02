import 'server-only';
import {createClient} from '@supabase/supabase-js';
import type {ShareRoutine} from './types';
export async function getPublicRoutine(token:string):Promise<ShareRoutine|null>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error('Supabase public connection not configured');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},db:{schema:'fitplan'}});
 const {data,error}=await db.rpc('get_public_routine',{p_token:token});
 if(error)throw error;
 return data as ShareRoutine|null;
}
