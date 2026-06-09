create extension if not exists citext with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'America/Toronto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.day_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  bladder_pain_morning smallint check (bladder_pain_morning between 0 and 10),
  bladder_pain_evening smallint check (bladder_pain_evening between 0 and 10),
  perceived_stress smallint check (perceived_stress between 0 and 10),
  external_stress smallint check (external_stress between 0 and 10),
  sleep_hours numeric(4,2) check (sleep_hours between 0 and 24),
  hydration_ml integer check (hydration_ml >= 0),
  notes text check (char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name extensions.citext not null check (char_length(btrim(name::text)) between 1 and 120 and name::text = btrim(name::text)),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.food_consumptions (
  id uuid primary key default gen_random_uuid(),
  day_entry_id uuid not null references public.day_entries(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete restrict,
  consumed_at time,
  created_at timestamptz not null default now()
);

create index day_entries_user_date_idx on public.day_entries(user_id, date desc);
create index foods_user_name_idx on public.foods(user_id, name);
create index food_consumptions_day_idx on public.food_consumptions(day_entry_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger day_entries_updated_at before update on public.day_entries
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, timezone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'timezone', 'America/Toronto'));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.day_entries enable row level security;
alter table public.foods enable row level security;
alter table public.food_consumptions enable row level security;

create policy "profiles own rows" on public.profiles for all
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "day entries own rows" on public.day_entries for all
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "foods own rows" on public.foods for all
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "consumptions through owned day and food" on public.food_consumptions for all
using (
  exists (select 1 from public.day_entries d where d.id = day_entry_id and d.user_id = (select auth.uid()))
  and exists (select 1 from public.foods f where f.id = food_id and f.user_id = (select auth.uid()))
)
with check (
  exists (select 1 from public.day_entries d where d.id = day_entry_id and d.user_id = (select auth.uid()))
  and exists (select 1 from public.foods f where f.id = food_id and f.user_id = (select auth.uid()))
);

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

    if v_requested_food_id is not null then
      select f.id into v_food_id from public.foods as f
      where f.id = v_requested_food_id and f.user_id = v_user_id;
    end if;
    if v_food_id is null then
      insert into public.foods(user_id, name) values (v_user_id, v_food_name)
      on conflict (user_id, name) do update set name = public.foods.name
      returning id into v_food_id;
    end if;
    insert into public.food_consumptions(day_entry_id, food_id, consumed_at)
    values (v_day_id, v_food_id, nullif(v_item ->> 'consumed_at', '')::time);
  end loop;
  return v_day_id;
end;
$$;

grant execute on function public.save_day_entry(date, smallint, smallint, smallint, smallint, numeric, integer, text, jsonb) to authenticated;
