-- FITPLAN v2 / 2026-11-04
-- Applied to the existing aleph_common / fitplan schema.
-- No Supabase project is created; existing auth/users, routines, and workouts stay intact.
-- Run ONCE after supabase/schema.sql when provisioning a new FITPLAN environment.

create table if not exists fitplan.plan_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references fitplan.users(user_id) on delete cascade,
  routine_id uuid references fitplan.routines(id) on delete set null,
  routine_title text not null,
  effective_week date not null,
  started_on date not null,
  days jsonb not null,
  reason text not null default 'activation',
  created_at timestamptz not null default now(),
  constraint plan_versions_week_monday check (extract(isodow from effective_week)=1),
  constraint plan_versions_days_array check (
    jsonb_typeof(days)='array' and jsonb_array_length(days)=7
    and octet_length(days::text)<=131072
  ),
  constraint plan_versions_reason check (reason in ('activation','template_update'))
);
create index if not exists plan_versions_lookup_idx
  on fitplan.plan_versions(user_id,effective_week desc,created_at desc);
alter table fitplan.plan_versions enable row level security;
revoke all on fitplan.plan_versions from public,anon,authenticated;
grant select,insert on fitplan.plan_versions to authenticated;
grant all on fitplan.plan_versions to service_role;
create policy "plan_versions_read_own" on fitplan.plan_versions
  for select to authenticated using (user_id=(select auth.uid()));
create policy "plan_versions_add_own_routine" on fitplan.plan_versions
  for insert to authenticated with check (
    user_id=(select auth.uid())
    and (routine_id is null or exists (
      select 1 from fitplan.routines r
      where r.id=routine_id and r.owner_id=(select auth.uid())
    ))
  );

create table if not exists fitplan.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references fitplan.users(user_id) on delete cascade,
  week_start date not null,
  routine_id uuid references fitplan.routines(id) on delete set null,
  routine_title text not null,
  days jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_plans_unique_owner_week unique(user_id,week_start),
  constraint weekly_plans_week_monday check(extract(isodow from week_start)=1),
  constraint weekly_plans_days_array check (
    jsonb_typeof(days)='array' and jsonb_array_length(days)=7
    and octet_length(days::text)<=131072
  )
);
create index if not exists weekly_plans_lookup_idx
  on fitplan.weekly_plans(user_id,week_start desc);
alter table fitplan.weekly_plans enable row level security;
revoke all on fitplan.weekly_plans from public,anon,authenticated;
grant select,insert,update on fitplan.weekly_plans to authenticated;
grant all on fitplan.weekly_plans to service_role;
create policy "weekly_plans_read_own" on fitplan.weekly_plans
  for select to authenticated using (user_id=(select auth.uid()));
create policy "weekly_plans_add_own_routine" on fitplan.weekly_plans
  for insert to authenticated with check (
    user_id=(select auth.uid())
    and (routine_id is null or exists (
      select 1 from fitplan.routines r
      where r.id=routine_id and r.owner_id=(select auth.uid())
    ))
  );
create policy "weekly_plans_update_own_routine" on fitplan.weekly_plans
  for update to authenticated using (user_id=(select auth.uid()))
  with check (
    user_id=(select auth.uid())
    and (routine_id is null or exists (
      select 1 from fitplan.routines r
      where r.id=routine_id and r.owner_id=(select auth.uid())
    ))
  );
