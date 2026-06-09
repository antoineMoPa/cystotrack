create type public.meal_period as enum ('morning', 'lunch', 'evening');

alter table public.food_consumptions
add column meal_period public.meal_period;

update public.food_consumptions
set meal_period = case
  when consumed_at is null or consumed_at < time '11:00' then 'morning'::public.meal_period
  when consumed_at < time '16:00' then 'lunch'::public.meal_period
  else 'evening'::public.meal_period
end;

alter table public.food_consumptions
alter column meal_period set not null;

alter table public.food_consumptions
drop column consumed_at;

create or replace function public.save_day_entry(
  p_date date,
  p_bladder_pain_morning smallint default null,
  p_bladder_pain_evening smallint default null,
  p_perceived_stress smallint default null,
  p_external_stress smallint default null,
  p_sleep_hours numeric default null,
  p_hydration_ml integer default null,
  p_notes text default null,
  p_consumptions jsonb default '[]'::jsonb
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_day_id uuid;
  v_item jsonb;
  v_food_id uuid;
  v_requested_food_id uuid;
  v_food_name text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_consumptions) <> 'array' then raise exception 'Consumptions must be an array'; end if;

  insert into public.day_entries(
    user_id, date, bladder_pain_morning, bladder_pain_evening, perceived_stress,
    external_stress, sleep_hours, hydration_ml, notes
  ) values (
    v_user_id, p_date, p_bladder_pain_morning, p_bladder_pain_evening, p_perceived_stress,
    p_external_stress, p_sleep_hours, p_hydration_ml, nullif(p_notes, '')
  )
  on conflict (user_id, date) do update set
    bladder_pain_morning = excluded.bladder_pain_morning,
    bladder_pain_evening = excluded.bladder_pain_evening,
    perceived_stress = excluded.perceived_stress,
    external_stress = excluded.external_stress,
    sleep_hours = excluded.sleep_hours,
    hydration_ml = excluded.hydration_ml,
    notes = excluded.notes
  returning id into v_day_id;

  delete from public.food_consumptions where day_entry_id = v_day_id;
  for v_item in select value from jsonb_array_elements(p_consumptions)
  loop
    v_requested_food_id := nullif(v_item ->> 'food_id', '')::uuid;
    v_food_id := null;
    v_food_name := btrim(v_item ->> 'food_name');
    if v_food_name is null or v_food_name = '' then raise exception 'Food name is required'; end if;
    if (v_item ->> 'meal_period') not in ('morning', 'lunch', 'evening') then
      raise exception 'Meal period is required';
    end if;

    if v_requested_food_id is not null then
      select f.id into v_food_id from public.foods as f
      where f.id = v_requested_food_id and f.user_id = v_user_id;
    end if;
    if v_food_id is null then
      insert into public.foods(user_id, name) values (v_user_id, v_food_name)
      on conflict (user_id, name) do update set name = public.foods.name
      returning id into v_food_id;
    end if;
    insert into public.food_consumptions(day_entry_id, food_id, meal_period)
    values (v_day_id, v_food_id, (v_item ->> 'meal_period')::public.meal_period);
  end loop;
  return v_day_id;
end;
$$;
