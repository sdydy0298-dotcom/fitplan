
-- FITPLAN personalized exercise entries. Existing 30 built-in guides remain unchanged.
alter table fitplan.exercise_catalog
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

create index if not exists exercise_catalog_owner_id_idx
  on fitplan.exercise_catalog(owner_id) where owner_id is not null;

alter table fitplan.exercise_catalog
  add constraint fitplan_custom_exercise_bounds
  check (
    owner_id is null or
    (
      id ~ '^custom-[0-9a-f]{32}$'
      and length(btrim(name)) between 1 and 80
      and length(btrim(equipment)) between 1 and 80
      and muscle in ('가슴','등','하체','어깨','팔','코어','기타')
      and level = '직접 등록'
    )
  );

-- Standard guides are public; custom exercise labels belong to the creator.
drop policy if exists "catalog visible" on fitplan.exercise_catalog;
create policy "catalog visible" on fitplan.exercise_catalog
  for select to anon,authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
create policy "custom exercise insert" on fitplan.exercise_catalog
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and id ~ '^custom-[0-9a-f]{32}$'
    and length(btrim(name)) between 1 and 80
    and length(btrim(equipment)) between 1 and 80
    and muscle in ('가슴','등','하체','어깨','팔','코어','기타')
    and level = '직접 등록'
    and coalesce(video_url,'') = ''
    and steps = '[]'::jsonb
    and primary_muscles = '{}'::text[]
    and caution = ''
  );
-- Only the columns needed to define a new custom exercise are writable.
grant insert (id,name,muscle,equipment,level,owner_id)
  on fitplan.exercise_catalog to authenticated;

create or replace function fitplan.get_public_routine(p_token text)
returns jsonb
language sql stable security definer set search_path=''
as $function$
  select jsonb_build_object(
    'title',r.title,
    'description',r.description,
    'routine_days',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'weekday',d.weekday,
          'position',d.position,
          'routine_items',coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'exercise_id',i.exercise_id,
                'exercise_name',case when c.owner_id is not null then c.name else null end,
                'position',i.position,
                'target_sets',i.target_sets,
                'target_reps',i.target_reps,
                'target_weight',i.target_weight,
                'notes',i.notes
              ) order by i.position,i.id)
            from fitplan.routine_items i
            join fitplan.exercise_catalog c on c.id=i.exercise_id
            where i.routine_day_id=d.id
          ),'[]'::jsonb)
        ) order by d.position,d.weekday)
      from fitplan.routine_days d
      where d.routine_id=r.id
    ),'[]'::jsonb)
  )
  from fitplan.routine_shares s
  join fitplan.routines r on r.id=s.routine_id
  where p_token ~ '^[a-f0-9]{64}$'
    and s.token=p_token and s.active=true and s.revoked_at is null
  limit 1;
$function$;
revoke all on function fitplan.get_public_routine(text) from public, anon,authenticated;
grant execute on function fitplan.get_public_routine(text) to anon,authenticated;

create or replace function fitplan.copy_public_routine(p_token text)
returns uuid
language plpgsql security definer set search_path=''
as $function$
declare
  v_user uuid;
  v_source record;
  v_new_routine uuid;
  v_new_day uuid;
  v_day record;
  v_item record;
  v_exercise record;
  v_target_id text;
  v_mappings jsonb := '{}'::jsonb;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Login is required' using errcode='28000'; end if;
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return null; end if;
  select r.id,r.title,r.description into v_source
  from fitplan.routine_shares s join fitplan.routines r on r.id=s.routine_id
  where s.token=p_token and s.active=true and s.revoked_at is null;
  if not found then return null; end if;
  insert into fitplan.routines(owner_id,title,description)
    values(v_user,left(v_source.title||' · 내 루틴',80),v_source.description)
    returning id into v_new_routine;
  for v_day in
    select d.id,d.weekday,d.position from fitplan.routine_days d
    where d.routine_id=v_source.id order by d.position,d.weekday
  loop
    insert into fitplan.routine_days(routine_id,weekday,position)
      values(v_new_routine,v_day.weekday,v_day.position)
      returning id into v_new_day;
    for v_item in
      select i.exercise_id,i.position,i.target_sets,i.target_reps,i.target_weight,i.notes
      from fitplan.routine_items i where i.routine_day_id=v_day.id
      order by i.position,i.id
    loop
      select c.owner_id,c.name,c.muscle,c.equipment into v_exercise
      from fitplan.exercise_catalog c where c.id=v_item.exercise_id;
      if not found then raise exception 'The routine references a missing exercise'; end if;
      v_target_id := v_item.exercise_id;
      if v_exercise.owner_id is not null and v_exercise.owner_id <> v_user then
        v_target_id := v_mappings->>v_item.exercise_id;
        if v_target_id is null then
          -- Reuse an exercise already defined by the recipient when possible.
          select c.id into v_target_id
          from fitplan.exercise_catalog c
          where c.owner_id=v_user and lower(c.name)=lower(v_exercise.name)
            and c.muscle=v_exercise.muscle
          order by c.created_at limit 1;
          if v_target_id is null then
            v_target_id := 'custom-'||replace(gen_random_uuid()::text,'-','');
            insert into fitplan.exercise_catalog
              (id,owner_id,name,muscle,equipment,level)
              values(v_target_id,v_user,v_exercise.name,v_exercise.muscle,v_exercise.equipment,'직접 등록');
          end if;
          v_mappings := v_mappings||jsonb_build_object(v_item.exercise_id,v_target_id);
        end if;
      end if;
      insert into fitplan.routine_items
        (routine_day_id,exercise_id,position,target_sets,target_reps,target_weight,notes)
        values(v_new_day,v_target_id,v_item.position,v_item.target_sets,
          v_item.target_reps,v_item.target_weight,v_item.notes);
    end loop;
  end loop;
  return v_new_routine;
end;
$function$;
revoke all on function fitplan.copy_public_routine(text) from public, anon,authenticated;
grant execute on function fitplan.copy_public_routine(text) to authenticated;
