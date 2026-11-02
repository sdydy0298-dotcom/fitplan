-- FITPLAN v1: Run ONLY in a fresh, dedicated Supabase project.
-- Do not apply to existing ALEPH projects. PostgreSQL 15+ / Supabase Auth.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (length(display_name) <= 40),
  created_at timestamptz not null default now()
);
create table if not exists public.exercise_catalog (
  id text primary key,
  name text not null,
  muscle text not null,
  equipment text not null,
  level text not null,
  primary_muscles text[] not null default '{}',
  steps jsonb not null default '[]'::jsonb,
  caution text not null default '',
  video_url text,
  link_checked_at date,
  created_at timestamptz not null default now()
);
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 80),
  description text check (length(description) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.routine_days (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  position smallint not null default 0,
  unique (routine_id, weekday)
);
create table if not exists public.routine_items (
  id uuid primary key default gen_random_uuid(),
  routine_day_id uuid not null references public.routine_days(id) on delete cascade,
  exercise_id text not null references public.exercise_catalog(id),
  position smallint not null default 0,
  target_sets smallint not null check (target_sets between 1 and 15),
  target_reps smallint not null check (target_reps between 1 and 300),
  target_weight numeric(8,2) not null default 0 check (target_weight between 0 and 2000),
  notes text check (length(notes) <= 250)
);
create table if not exists public.routine_shares (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null unique references public.routines(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique check (token ~ '^[a-f0-9]{64}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid references public.routines(id) on delete set null,
  performed_at date not null,
  notes text check (length(notes) <= 500),
  created_at timestamptz not null default now()
);
create table if not exists public.workout_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id text not null references public.exercise_catalog(id),
  position smallint not null default 0
);
create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_entry_id uuid not null references public.workout_entries(id) on delete cascade,
  set_no smallint not null check (set_no between 1 and 20),
  reps smallint not null check (reps between 0 and 300),
  weight numeric(8,2) not null default 0 check (weight between 0 and 2000),
  unique (workout_entry_id, set_no)
);
create index if not exists idx_routines_owner on public.routines(owner_id,updated_at desc);
create index if not exists idx_workouts_owner_date on public.workout_sessions(user_id,performed_at desc);
create index if not exists idx_shares_active_token on public.routine_shares(token) where active;

alter table public.profiles enable row level security;
alter table public.exercise_catalog enable row level security;
alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_items enable row level security;
alter table public.routine_shares enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_entries enable row level security;
alter table public.workout_sets enable row level security;

-- Data API grants and RLS are TWO separate protections.
revoke all on public.profiles,public.exercise_catalog,public.routines,public.routine_days,public.routine_items,
  public.routine_shares,public.workout_sessions,public.workout_entries,public.workout_sets from anon,authenticated;
grant select on public.exercise_catalog to anon,authenticated;
grant select,insert,update,delete on public.profiles,public.routines,public.routine_days,public.routine_items,
  public.routine_shares,public.workout_sessions,public.workout_entries,public.workout_sets to authenticated;

create policy "catalog visible" on public.exercise_catalog for select to anon,authenticated using (true);
create policy "profile read" on public.profiles for select to authenticated using (user_id=(select auth.uid()));
create policy "profile insert" on public.profiles for insert to authenticated with check (user_id=(select auth.uid()));
create policy "profile update" on public.profiles for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "profile delete" on public.profiles for delete to authenticated using (user_id=(select auth.uid()));

create policy "routine read" on public.routines for select to authenticated using (owner_id=(select auth.uid()));
create policy "routine insert" on public.routines for insert to authenticated with check (owner_id=(select auth.uid()));
create policy "routine update" on public.routines for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy "routine delete" on public.routines for delete to authenticated using (owner_id=(select auth.uid()));

create policy "day read" on public.routine_days for select to authenticated using (
  exists(select 1 from public.routines r where r.id=routine_id and r.owner_id=(select auth.uid())));
create policy "day insert" on public.routine_days for insert to authenticated with check (
  exists(select 1 from public.routines r where r.id=routine_id and r.owner_id=(select auth.uid())));
create policy "day update" on public.routine_days for update to authenticated using (
  exists(select 1 from public.routines r where r.id=routine_id and r.owner_id=(select auth.uid()))) with check (
  exists(select 1 from public.routines r where r.id=routine_id and r.owner_id=(select auth.uid())));
create policy "day delete" on public.routine_days for delete to authenticated using (
  exists(select 1 from public.routines r where r.id=routine_id and r.owner_id=(select auth.uid())));

create policy "item read" on public.routine_items for select to authenticated using (
  exists(select 1 from public.routine_days d join public.routines r on r.id=d.routine_id
    where d.id=routine_day_id and r.owner_id=(select auth.uid())));
create policy "item insert" on public.routine_items for insert to authenticated with check (
  exists(select 1 from public.routine_days d join public.routines r on r.id=d.routine_id
    where d.id=routine_day_id and r.owner_id=(select auth.uid())));
create policy "item update" on public.routine_items for update to authenticated using (
  exists(select 1 from public.routine_days d join public.routines r on r.id=d.routine_id
    where d.id=routine_day_id and r.owner_id=(select auth.uid()))) with check (
  exists(select 1 from public.routine_days d join public.routines r on r.id=d.routine_id
    where d.id=routine_day_id and r.owner_id=(select auth.uid())));
create policy "item delete" on public.routine_items for delete to authenticated using (
  exists(select 1 from public.routine_days d join public.routines r on r.id=d.routine_id
    where d.id=routine_day_id and r.owner_id=(select auth.uid())));

create policy "share read owner" on public.routine_shares for select to authenticated using (owner_id=(select auth.uid()));
create policy "share insert owner" on public.routine_shares for insert to authenticated with check (
  owner_id=(select auth.uid()) and exists(select 1 from public.routines r where r.id=routine_id and r.owner_id=(select auth.uid())));
create policy "share update owner" on public.routine_shares for update to authenticated using (owner_id=(select auth.uid())) with check (
  owner_id=(select auth.uid()) and exists(select 1 from public.routines r where r.id=routine_id and r.owner_id=(select auth.uid())));
create policy "share delete owner" on public.routine_shares for delete to authenticated using (owner_id=(select auth.uid()));

create policy "session read" on public.workout_sessions for select to authenticated using (user_id=(select auth.uid()));
create policy "session insert" on public.workout_sessions for insert to authenticated with check (
  user_id=(select auth.uid()) and (routine_id is null or exists(select 1 from public.routines r where r.id=routine_id and r.owner_id=(select auth.uid()))));
create policy "session update" on public.workout_sessions for update to authenticated using (user_id=(select auth.uid())) with check (
  user_id=(select auth.uid()) and (routine_id is null or exists(select 1 from public.routines r where r.id=routine_id and r.owner_id=(select auth.uid()))));
create policy "session delete" on public.workout_sessions for delete to authenticated using (user_id=(select auth.uid()));

create policy "entry read" on public.workout_entries for select to authenticated using (
  exists(select 1 from public.workout_sessions s where s.id=session_id and s.user_id=(select auth.uid())));
create policy "entry insert" on public.workout_entries for insert to authenticated with check (
  exists(select 1 from public.workout_sessions s where s.id=session_id and s.user_id=(select auth.uid())));
create policy "entry update" on public.workout_entries for update to authenticated using (
  exists(select 1 from public.workout_sessions s where s.id=session_id and s.user_id=(select auth.uid()))) with check (
  exists(select 1 from public.workout_sessions s where s.id=session_id and s.user_id=(select auth.uid())));
create policy "entry delete" on public.workout_entries for delete to authenticated using (
  exists(select 1 from public.workout_sessions s where s.id=session_id and s.user_id=(select auth.uid())));

create policy "set read" on public.workout_sets for select to authenticated using (
  exists(select 1 from public.workout_entries e join public.workout_sessions s on s.id=e.session_id
    where e.id=workout_entry_id and s.user_id=(select auth.uid())));
create policy "set insert" on public.workout_sets for insert to authenticated with check (
  exists(select 1 from public.workout_entries e join public.workout_sessions s on s.id=e.session_id
    where e.id=workout_entry_id and s.user_id=(select auth.uid())));
create policy "set update" on public.workout_sets for update to authenticated using (
  exists(select 1 from public.workout_entries e join public.workout_sessions s on s.id=e.session_id
    where e.id=workout_entry_id and s.user_id=(select auth.uid()))) with check (
  exists(select 1 from public.workout_entries e join public.workout_sessions s on s.id=e.session_id
    where e.id=workout_entry_id and s.user_id=(select auth.uid())));
create policy "set delete" on public.workout_sets for delete to authenticated using (
  exists(select 1 from public.workout_entries e join public.workout_sessions s on s.id=e.session_id
    where e.id=workout_entry_id and s.user_id=(select auth.uid())));

-- Atomic save operations: SECURITY INVOKER, caller's RLS enforced.
create or replace function public.save_routine(p_id uuid,p_title text,p_description text,p_days jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_day jsonb; v_item jsonb; v_day_id uuid; v_pos int; v_item_pos int;
begin
 if (select auth.uid()) is null then raise exception 'Login required'; end if;
 if length(btrim(coalesce(p_title,''))) not between 1 and 80 then raise exception 'Invalid title'; end if;
 if jsonb_typeof(p_days) is distinct from 'array' or jsonb_array_length(p_days)>7 then raise exception 'Invalid days'; end if;
 if p_id is null then
   insert into public.routines(owner_id,title,description) values((select auth.uid()),btrim(p_title),p_description) returning id into v_id;
 else
   update public.routines set title=btrim(p_title),description=p_description,updated_at=now()
     where id=p_id and owner_id=(select auth.uid()) returning id into v_id;
   if v_id is null then raise exception 'Routine not found'; end if;
   delete from public.routine_days where routine_id=v_id;
 end if;
 v_pos:=0;
 for v_day in select value from jsonb_array_elements(p_days) loop
   if jsonb_typeof(v_day->'items') is distinct from 'array' or jsonb_array_length(v_day->'items')>20 then raise exception 'Invalid exercise list'; end if;
   insert into public.routine_days(routine_id,weekday,position)
     values(v_id,(v_day->>'weekday')::smallint,v_pos) returning id into v_day_id;
   v_item_pos:=0;
   for v_item in select value from jsonb_array_elements(v_day->'items') loop
     insert into public.routine_items(routine_day_id,exercise_id,position,target_sets,target_reps,target_weight,notes)
     values(v_day_id,v_item->>'exercise_id',v_item_pos,(v_item->>'target_sets')::smallint,(v_item->>'target_reps')::smallint,(v_item->>'target_weight')::numeric,nullif(v_item->>'notes',''));
     v_item_pos:=v_item_pos+1;
   end loop;
   v_pos:=v_pos+1;
 end loop;
 return v_id;
end; $$;
create or replace function public.save_workout(p_id uuid,p_date date,p_routine_id uuid,p_notes text,p_entries jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_entry jsonb; v_set jsonb; v_entry_id uuid; v_pos int; v_set_no int;
begin
 if (select auth.uid()) is null then raise exception 'Login required'; end if;
 if jsonb_typeof(p_entries) is distinct from 'array' or jsonb_array_length(p_entries)>30 then raise exception 'Invalid workout'; end if;
 if p_id is null then
   insert into public.workout_sessions(user_id,routine_id,performed_at,notes)
     values((select auth.uid()),p_routine_id,p_date,p_notes) returning id into v_id;
 else
   update public.workout_sessions set performed_at=p_date,routine_id=p_routine_id,notes=p_notes
     where id=p_id and user_id=(select auth.uid()) returning id into v_id;
   if v_id is null then raise exception 'Workout not found'; end if;
   delete from public.workout_entries where session_id=v_id;
 end if;
 v_pos:=0;
 for v_entry in select value from jsonb_array_elements(p_entries) loop
   if jsonb_typeof(v_entry->'sets') is distinct from 'array' or jsonb_array_length(v_entry->'sets')>20 then raise exception 'Invalid sets'; end if;
   insert into public.workout_entries(session_id,exercise_id,position)
     values(v_id,v_entry->>'exercise_id',v_pos) returning id into v_entry_id;
   v_set_no:=1;
   for v_set in select value from jsonb_array_elements(v_entry->'sets') loop
     insert into public.workout_sets(workout_entry_id,set_no,reps,weight)
       values(v_entry_id,v_set_no,(v_set->>'reps')::smallint,(v_set->>'weight')::numeric);
     v_set_no:=v_set_no+1;
   end loop;
   v_pos:=v_pos+1;
 end loop;
 return v_id;
end; $$;
revoke all on function public.save_routine(uuid,text,text,jsonb) from public,anon;
revoke all on function public.save_workout(uuid,date,uuid,text,jsonb) from public,anon;
grant execute on function public.save_routine(uuid,text,text,jsonb) to authenticated;
grant execute on function public.save_workout(uuid,date,uuid,text,jsonb) to authenticated;

-- Exercise data seed: curated guides and verified source-link locations.
insert into public.exercise_catalog(id,name,muscle,equipment,level,primary_muscles,steps,caution,video_url,link_checked_at) values
('bench-press','바벨 벤치프레스','가슴','바벨','중급',ARRAY['대흉근','삼두근']::text[],'["벤치에 누워 발을 바닥에 고정합니다.", "어깨를 안정시키고 바벨을 가슴 쪽으로 천천히 내립니다.", "반동 없이 바벨을 위로 밀어 올립니다."]'::jsonb,'보조자 또는 안전바를 사용하고 과도한 중량을 피하세요.','https://www.muscleandstrength.com/exercises/barbell-bench-press.html',current_date),
('incline-dumbbell-press','인클라인 덤벨 프레스','가슴','덤벨','초급',ARRAY['상부 가슴','삼두근']::text[],'["벤치를 약간 기울이고 등을 고정합니다.", "덤벨을 천천히 내리며 팔꿈치를 통제합니다.", "가슴에 힘을 주어 덤벨을 위로 밀어 올립니다."]'::jsonb,'어깨가 불편하면 가동 범위와 벤치 각도를 낮추세요.','https://www.muscleandstrength.com/exercises/incline-dumbbell-bench-press.html',current_date),
('push-up','푸시업','가슴','맨몸','초급',ARRAY['대흉근','삼두근','코어']::text[],'["손을 어깨보다 약간 넓게 짚고 몸을 일직선으로 유지합니다.", "팔꿈치를 접으며 가슴을 바닥 쪽으로 내립니다.", "상체와 골반을 함께 밀어 시작 위치로 돌아옵니다."]'::jsonb,'허리를 꺾거나 엉덩이가 떨어지지 않도록 주의하세요.','https://www.muscleandstrength.com/exercises/push-up.html',current_date),
('lat-pulldown','랫풀다운','등','케이블 머신','초급',ARRAY['광배근','상완이두근']::text[],'["가슴을 세우고 바를 편안한 너비로 잡습니다.", "어깨를 내리며 바를 윗가슴 쪽으로 당깁니다.", "상체를 크게 젖히지 않고 천천히 팔을 폅니다."]'::jsonb,'목 뒤로 바를 내리거나 상체 반동을 크게 사용하지 마세요.','https://www.muscleandstrength.com/exercises/lat-pull-down.html',current_date),
('bent-over-row','바벨 벤트오버 로우','등','바벨','중급',ARRAY['광배근','능형근']::text[],'["무릎을 약간 굽히고 엉덩이를 뒤로 빼 상체를 숙입니다.", "허리를 중립으로 유지하고 바벨을 배 쪽으로 당깁니다.", "천천히 내리며 자세를 유지합니다."]'::jsonb,'허리 자세가 무너지면 무게를 줄이세요.','https://www.muscleandstrength.com/exercises/bent-over-barbell-row.html',current_date),
('seated-row','시티드 케이블 로우','등','케이블 머신','초급',ARRAY['광배근','승모근 중부']::text[],'["등을 세우고 손잡이를 잡습니다.", "팔꿈치를 뒤로 보내며 손잡이를 배 쪽으로 당깁니다.", "몸통을 크게 움직이지 않고 천천히 돌아갑니다."]'::jsonb,'무게를 당기기 위해 허리를 과하게 젖히지 마세요.','https://www.muscleandstrength.com/exercises/seated-row.html',current_date),
('back-squat','바벨 백 스쿼트','하체','바벨','중급',ARRAY['대퇴사두근','둔근']::text[],'["바벨을 등 위에 안정적으로 올리고 발을 편안한 너비로 벌립니다.", "무릎과 발끝 방향을 맞추며 엉덩이를 낮춥니다.", "발바닥으로 바닥을 밀며 일어섭니다."]'::jsonb,'허리가 과하게 굽거나 균형이 무너지면 중량을 낮추세요.','https://www.muscleandstrength.com/exercises/squat.html',current_date),
('leg-press','레그프레스','하체','레그프레스 머신','초급',ARRAY['대퇴사두근','둔근']::text[],'["등과 골반을 시트에 밀착하고 발을 발판에 놓습니다.", "통제 가능한 범위까지 무릎을 구부립니다.", "발판을 밀어 올리되 무릎을 강하게 잠그지 않습니다."]'::jsonb,'골반이 시트에서 뜰 만큼 깊이 내리지 마세요.','https://www.muscleandstrength.com/exercises/45-degree-leg-press.html',current_date),
('romanian-deadlift','루마니안 데드리프트','하체','바벨','중급',ARRAY['햄스트링','둔근']::text[],'["무릎을 약간 굽힌 상태에서 바벨을 몸 가까이 둡니다.", "엉덩이를 뒤로 보내며 상체를 숙입니다.", "햄스트링의 긴장을 유지하며 일어섭니다."]'::jsonb,'허리를 둥글게 말아 내리거나 무리해서 깊이 숙이지 마세요.','https://www.muscleandstrength.com/exercises/romanian-deadlift',current_date),
('walking-lunge','워킹 런지','하체','맨몸·덤벨','초급',ARRAY['대퇴사두근','둔근']::text[],'["한 발을 앞으로 크게 내딛습니다.", "상체를 세우고 두 무릎을 구부려 내려갑니다.", "앞발에 힘을 주어 일어나며 다음 발을 내딛습니다."]'::jsonb,'무릎이 안쪽으로 모이지 않게 주의하세요.','https://www.muscleandstrength.com/exercises/dumbbell-walking-lunge.html',current_date),
('overhead-press','오버헤드 프레스','어깨','바벨','중급',ARRAY['삼각근','삼두근']::text[],'["바벨을 어깨 앞에 놓고 몸통에 힘을 줍니다.", "바벨을 머리 위로 곧게 밀어 올립니다.", "천천히 어깨 앞으로 내립니다."]'::jsonb,'허리가 과도하게 젖혀지지 않도록 복부에 힘을 주세요.','https://www.muscleandstrength.com/exercises/military-press.html',current_date),
('lateral-raise','덤벨 레터럴 레이즈','어깨','덤벨','초급',ARRAY['측면 삼각근']::text[],'["가벼운 덤벨을 들고 팔꿈치를 조금 굽힙니다.", "팔을 옆으로 어깨 높이 정도까지 올립니다.", "반동 없이 천천히 내립니다."]'::jsonb,'몸을 흔들어 무게를 올리지 마세요.','https://www.muscleandstrength.com/exercises/dumbbell-lateral-raise.html',current_date),
('face-pull','케이블 페이스풀','어깨','케이블 머신','초급',ARRAY['후면 삼각근','상부 등']::text[],'["로프를 얼굴 높이에 맞춥니다.", "팔꿈치를 옆으로 벌리며 로프를 얼굴 쪽으로 당깁니다.", "견갑을 통제하며 천천히 돌아갑니다."]'::jsonb,'목에 힘을 과하게 주지 마세요.','https://www.muscleandstrength.com/exercises/cable-face-pull',current_date),
('dumbbell-curl','덤벨 바이셉 컬','팔','덤벨','초급',ARRAY['상완이두근']::text[],'["팔꿈치를 몸통 옆에 고정합니다.", "덤벨을 어깨 방향으로 천천히 들어 올립니다.", "팔을 완전히 떨어뜨리지 않고 통제하며 내립니다."]'::jsonb,'상체 반동으로 덤벨을 들어 올리지 마세요.','https://www.muscleandstrength.com/exercises/standing-dumbbell-curl.html',current_date),
('rope-pushdown','로프 트라이셉 푸시다운','팔','케이블 머신','초급',ARRAY['삼두근']::text[],'["로프를 잡고 팔꿈치를 몸통 옆에 둡니다.", "팔꿈치 위치를 유지하며 로프를 아래로 밀어냅니다.", "천천히 원위치로 돌아옵니다."]'::jsonb,'몸통을 숙이거나 어깨를 크게 움직이지 마세요.','https://www.muscleandstrength.com/exercises/rope-tricep-extension.html',current_date),
('plank','플랭크','코어','맨몸','초급',ARRAY['복부','체간 안정근']::text[],'["팔꿈치를 어깨 아래에 두고 전완을 바닥에 댑니다.", "머리부터 발뒤꿈치까지 몸을 일직선으로 유지합니다.", "자연스럽게 호흡하며 자세를 유지합니다."]'::jsonb,'허리를 과하게 꺾거나 숨을 참지 마세요.','https://www.muscleandstrength.com/exercises/hover.html',current_date),
('dead-bug','데드버그','코어','맨몸','초급',ARRAY['복직근','복횡근']::text[],'["천장을 보고 누워 팔과 다리를 들어 올립니다.", "반대쪽 팔과 다리를 천천히 바닥 방향으로 뻗습니다.", "허리 위치를 유지하며 시작 위치로 돌아옵니다."]'::jsonb,'허리가 지나치게 뜨지 않을 범위까지만 움직이세요.','https://www.muscleandstrength.com/exercises/dead-bug',current_date),
('crunch','크런치','코어','맨몸','초급',ARRAY['복직근']::text[],'["무릎을 굽히고 등을 바닥에 대고 눕습니다.", "배에 힘을 주고 어깨뼈가 바닥에서 살짝 뜨도록 상체를 올립니다.", "반동 없이 천천히 내려옵니다."]'::jsonb,'목을 손으로 세게 당기지 마세요.','https://www.muscleandstrength.com/exercises/floor-crunch-legs-on-bench.html',current_date)
on conflict (id) do update set name=excluded.name,muscle=excluded.muscle,equipment=excluded.equipment,level=excluded.level,primary_muscles=excluded.primary_muscles,steps=excluded.steps,caution=excluded.caution,video_url=excluded.video_url,link_checked_at=excluded.link_checked_at;
