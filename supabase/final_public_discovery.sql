-- FITPLAN final submission: explicitly opted-in public routine discovery
-- Safe default: every existing link-only share remains excluded from discovery.
alter table fitplan.routine_shares
  add column if not exists discoverable boolean not null default false;

alter table fitplan.routine_shares
  add constraint share_discovery_requires_active
  check (not discoverable or (active and revoked_at is null));

create index if not exists routine_shares_discoverable_idx
  on fitplan.routine_shares (created_at desc)
  where active and discoverable and revoked_at is null;

-- Public-facing RPC with a deliberately narrow response.
-- Only shares whose owners explicitly ticked 'public discovery' are returned.
-- No user IDs, email addresses, exercise logs or auth metadata are disclosed.
create or replace function fitplan.list_discoverable_routines(p_limit integer default 60)
returns jsonb
language sql stable security definer
set search_path = ''
as $fn$
 select coalesce(jsonb_agg(
    jsonb_build_object(
      'token',q.token,
      'title',q.title,
      'description',q.description,
      'days',q.days,
      'exercises',q.exercises,
      'weekdays',q.weekdays,
      'shared_at',q.shared_at
    ) order by q.shared_at desc
 ), '[]'::jsonb)
 from (
  select s.token,r.title,left(coalesce(r.description,''),320) as description,
    count(distinct d.weekday)::int as days,
    count(i.id)::int as exercises,
    coalesce(array_agg(distinct d.weekday order by d.weekday)
      filter (where d.weekday is not null),'{}'::int[]) as weekdays,
    s.created_at as shared_at
  from fitplan.routine_shares s
  join fitplan.routines r on r.id=s.routine_id
  left join fitplan.routine_days d on d.routine_id=r.id
  left join fitplan.routine_items i on i.routine_day_id=d.id
  where s.active is true and s.revoked_at is null and s.discoverable is true
  group by s.id,s.token,s.created_at,r.id,r.title,r.description
  order by s.created_at desc,s.id desc
  limit least(greatest(coalesce(p_limit,40),1),60)
 ) q;
$fn$;
revoke all on function fitplan.list_discoverable_routines(integer) from public;
grant execute on function fitplan.list_discoverable_routines(integer) to anon,authenticated;
notify pgrst,'reload schema';