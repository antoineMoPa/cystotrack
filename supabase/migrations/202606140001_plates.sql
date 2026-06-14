create type public.measure_unit as enum ('ml', 'cup', 'teaspoon', 'tablespoon');

create table public.plates (
  id uuid primary key default gen_random_uuid(),
  day_entry_id uuid not null references public.day_entries(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120 and name = btrim(name)),
  meal_period public.meal_period not null,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now()
);

create table public.plate_ingredients (
  id uuid primary key default gen_random_uuid(),
  plate_id uuid not null references public.plates(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete restrict,
  quantity numeric(8,2) check (quantity > 0),
  measure_unit public.measure_unit,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now()
);

create index plates_day_idx on public.plates(day_entry_id, position);
create index plate_ingredients_plate_idx on public.plate_ingredients(plate_id, position);

with grouped_consumptions as (
  select day_entry_id, meal_period, row_number() over (partition by day_entry_id order by min(created_at), meal_period) - 1 as position
  from public.food_consumptions
  group by day_entry_id, meal_period
)
insert into public.plates(day_entry_id, name, meal_period, position)
select day_entry_id, 'Aliments', meal_period, position
from grouped_consumptions;

with numbered_consumptions as (
  select c.id, c.day_entry_id, c.food_id, c.meal_period, row_number() over (partition by c.day_entry_id, c.meal_period order by c.created_at, c.id) - 1 as position
  from public.food_consumptions as c
)
insert into public.plate_ingredients(plate_id, food_id, position)
select p.id, c.food_id, c.position
from numbered_consumptions as c
join public.plates as p on p.day_entry_id = c.day_entry_id and p.meal_period = c.meal_period;

alter table public.plates enable row level security;
alter table public.plate_ingredients enable row level security;

create policy "plates through owned day" on public.plates for all
using (exists (select 1 from public.day_entries d where d.id = day_entry_id and d.user_id = (select auth.uid())))
with check (exists (select 1 from public.day_entries d where d.id = day_entry_id and d.user_id = (select auth.uid())));

create policy "plate ingredients through owned plate and food" on public.plate_ingredients for all
using (
  exists (
    select 1 from public.plates p
    join public.day_entries d on d.id = p.day_entry_id
    where p.id = plate_id and d.user_id = (select auth.uid())
  )
  and exists (select 1 from public.foods f where f.id = food_id and f.user_id = (select auth.uid()))
)
with check (
  exists (
    select 1 from public.plates p
    join public.day_entries d on d.id = p.day_entry_id
    where p.id = plate_id and d.user_id = (select auth.uid())
  )
  and exists (select 1 from public.foods f where f.id = food_id and f.user_id = (select auth.uid()))
);

grant select on table public.plates to authenticated;
grant select on table public.plate_ingredients to authenticated;
grant insert, delete on table public.plates to authenticated;
grant insert, delete on table public.plate_ingredients to authenticated;

drop function public.save_day_entry(date, smallint, smallint, smallint, smallint, numeric, integer, text, jsonb);

create or replace function public.save_day_entry(
  p_date date,
  p_bladder_pain_morning smallint default null,
  p_bladder_pain_evening smallint default null,
  p_perceived_stress smallint default null,
  p_external_stress smallint default null,
  p_sleep_hours numeric default null,
  p_hydration_ml integer default null,
  p_notes text default null,
  p_plates jsonb default '[]'::jsonb
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_day_id uuid;
  v_plate jsonb;
  v_ingredient jsonb;
  v_plate_id uuid;
  v_food_id uuid;
  v_requested_food_id uuid;
  v_food_name text;
  v_plate_name text;
  v_plate_position integer := 0;
  v_ingredient_position integer;
  v_measure_unit text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_plates) <> 'array' then raise exception 'Plates must be an array'; end if;

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

  delete from public.plates where day_entry_id = v_day_id;
  delete from public.food_consumptions where day_entry_id = v_day_id;

  for v_plate in select value from jsonb_array_elements(p_plates)
  loop
    v_plate_name := btrim(v_plate ->> 'name');
    if v_plate_name is null or v_plate_name = '' then raise exception 'Plate name is required'; end if;
    if (v_plate ->> 'meal_period') not in ('morning', 'lunch', 'evening') then raise exception 'Meal period is required'; end if;
    if jsonb_typeof(v_plate -> 'ingredients') <> 'array' then raise exception 'Ingredients must be an array'; end if;

    insert into public.plates(day_entry_id, name, meal_period, position)
    values (v_day_id, v_plate_name, (v_plate ->> 'meal_period')::public.meal_period, v_plate_position)
    returning id into v_plate_id;

    v_ingredient_position := 0;
    for v_ingredient in select value from jsonb_array_elements(v_plate -> 'ingredients')
    loop
      v_requested_food_id := nullif(v_ingredient ->> 'food_id', '')::uuid;
      v_food_id := null;
      v_food_name := btrim(v_ingredient ->> 'food_name');
      v_measure_unit := nullif(v_ingredient ->> 'measure_unit', '');
      if v_food_name is null or v_food_name = '' then raise exception 'Food name is required'; end if;
      if v_measure_unit is not null and v_measure_unit not in ('ml', 'cup', 'teaspoon', 'tablespoon') then raise exception 'Measure unit is invalid'; end if;

      if v_requested_food_id is not null then
        select f.id into v_food_id from public.foods as f
        where f.id = v_requested_food_id and f.user_id = v_user_id;
      end if;
      if v_food_id is null then
        insert into public.foods(user_id, name) values (v_user_id, v_food_name)
        on conflict (user_id, name) do update set name = public.foods.name
        returning id into v_food_id;
      end if;
      insert into public.plate_ingredients(plate_id, food_id, quantity, measure_unit, position)
      values (v_plate_id, v_food_id, nullif(v_ingredient ->> 'quantity', '')::numeric, v_measure_unit::public.measure_unit, v_ingredient_position);
      v_ingredient_position := v_ingredient_position + 1;
    end loop;

    v_plate_position := v_plate_position + 1;
  end loop;
  return v_day_id;
end;
$$;

grant execute on function public.save_day_entry(date, smallint, smallint, smallint, smallint, numeric, integer, text, jsonb) to authenticated;
