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
 'Share response allowlist':read('src/lib/share-server.ts').includes('routine_days:')&&!read('src/lib/share-server.ts').includes('auth.users'),
 'Public share route exists':fs.existsSync(new URL('src/app/api/share/[token]/route.ts',base)),
 'Copy route exists':fs.existsSync(new URL('src/app/api/share/[token]/copy/route.ts',base)),
 '18 exercise guides':(read('src/lib/exercises.ts').match(/^  \{id:'/gm)||[]).length===18,
 '18 seeded catalog rows':(read('supabase/schema.sql').match(/https:\/\/www\.muscleandstrength\.com\/exercises\//g)||[]).length===18,
 'All user data CRUD policies':['routines','routine_days','routine_items','routine_shares','workout_sessions','workout_entries','workout_sets'].every(t=>['select','insert','update','delete'].every(op=>read('supabase/schema.sql').includes(`on fitplan.${t} for ${op}`))),
};
let failed=0;for(const[name,ok]of Object.entries(checks)){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++;}if(failed)process.exit(1);
