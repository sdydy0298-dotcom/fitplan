import fs from 'node:fs';
import path from 'node:path';
const base=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,base),'utf8');
const checks={
 'Plan included':fs.existsSync(new URL('plan.md',base)),
 'All 9 database tables present': ['profiles','exercise_catalog','routines','routine_days','routine_items','routine_shares','workout_sessions','workout_entries','workout_sets'].every(t=>read('supabase/schema.sql').includes(`create table if not exists fitplan.${t}`)),
 'All user data tables RLS enabled':['routines','routine_days','routine_items','routine_shares','workout_sessions','workout_entries','workout_sets'].every(t=>read('supabase/schema.sql').includes(`alter table fitplan.${t} enable row level security`)),
 'Save functions transactional':read('supabase/schema.sql').includes('function fitplan.save_routine')&&read('supabase/schema.sql').includes('function fitplan.save_workout'),
 'Server secret not client-exposed':!read('src/lib/admin.ts').includes('NEXT_PUBLIC_SUPABASE_SECRET'),
 'Share response allowlist':read('src/lib/share-server.ts').includes("get_public_routine")&&read('src/app/api/share/[token]/route.ts').includes('routine'),
 'Public share route exists':fs.existsSync(new URL('src/app/api/share/[token]/route.ts',base)),
 'Copy route exists':fs.existsSync(new URL('src/app/api/share/[token]/copy/route.ts',base)),
 '30 exercise image assets': [...read('src/lib/exercises.ts').matchAll(/^  [{]id:'([^']+)'/gm)].length === 30 && [...read('src/lib/exercises.ts').matchAll(/^  [{]id:'([^']+)'/gm)].every(m=>fs.existsSync(new URL('public/exercises/'+m[1]+'.webp',base))),
 'No email delivery dependency':!read('src/app/login/page.tsx').includes('resetPasswordForEmail')&&!read('src/app/login/page.tsx').includes('verifyOtp')&&!fs.existsSync(new URL('src/app/reset-password/page.tsx',base)),



 'FITPLAN server signup':read('src/app/login/page.tsx').includes("functions.invoke('fitplan-register'")&&read('supabase/functions/fitplan-register/index.ts').includes('auth.admin.createUser'),
 'Signup uses no email delivery':!read('src/app/login/page.tsx').includes('auth.signUp(')&&!read('src/app/login/page.tsx').includes('verifyOtp')&&read('supabase/functions/fitplan-register/index.ts').includes('email_confirm: true'),
 'Signup server rate limits':read('supabase/functions/fitplan-register/index.ts').includes('allow_signup_attempt')&&read('supabase/fitplan_signup_throttle.sql').includes('enable row level security'),
 'Signup remains manual login':read('src/app/login/page.tsx').includes("setMode('login')")&&!read('src/app/login/page.tsx').includes('signOut('),
 '30 exercise guides':(read('src/lib/exercises.ts').match(/^  \{id:'/gm)||[]).length===30,
 '30 seeded catalog rows':(read('supabase/schema.sql').match(/https:\/\/www\.muscleandstrength\.com\/exercises\//g)||[]).length===30,
 'All user data CRUD policies':['routines','routine_days','routine_items','routine_shares','workout_sessions','workout_entries','workout_sets'].every(t=>['select','insert','update','delete'].every(op=>read('supabase/schema.sql').includes(`on fitplan.${t} for ${op}`))),
};
let failed=0;for(const[name,ok]of Object.entries(checks)){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++;}if(failed)process.exit(1);
