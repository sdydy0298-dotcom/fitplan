
-- Dedicated throttle for FITPLAN's public registration endpoint.
-- Keys are SHA-256 hashes created server-side; no raw emails or IP addresses.
create table if not exists fitplan.signup_rate_limits (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  hit_count integer not null default 0 check (hit_count >= 0)
);
alter table fitplan.signup_rate_limits enable row level security;

-- No anon/authenticated access to rate-limit bookkeeping.
revoke all on fitplan.signup_rate_limits from public, anon, authenticated;
grant select,insert,update on fitplan.signup_rate_limits to service_role;

create or replace function fitplan.allow_signup_attempt(
 p_key_hash text, p_limit integer, p_window_seconds integer
)
returns boolean
language plpgsql
security invoker
set search_path=''
as $function$
declare
 v_hits integer;
begin
 if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$'
    or p_limit is null or p_limit not between 1 and 40
    or p_window_seconds is null or p_window_seconds not between 60 and 86400 then
   return false;
 end if;

 insert into fitplan.signup_rate_limits as lim(key_hash,window_started_at,hit_count)
 values (p_key_hash, now(), 1)
 on conflict (key_hash) do update set
   window_started_at=case when lim.window_started_at <= now() - make_interval(secs => p_window_seconds)
     then now() else lim.window_started_at end,
   hit_count=case when lim.window_started_at <= now() - make_interval(secs => p_window_seconds)
     then 1 else lim.hit_count+1 end
 returning hit_count into v_hits;
 return v_hits <= p_limit;
end;
$function$;

revoke all on function fitplan.allow_signup_attempt(text,integer,integer)
 from public, anon, authenticated;
grant execute on function fitplan.allow_signup_attempt(text,integer,integer)
 to service_role;

comment on table fitplan.signup_rate_limits is
 'Internal FITPLAN signup throttle: server-generated salted hashes only, service-role access.';
