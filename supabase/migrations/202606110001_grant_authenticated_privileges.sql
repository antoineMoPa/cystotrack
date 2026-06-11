grant select on table public.day_entries to authenticated;
grant select on table public.foods to authenticated;
grant select on table public.food_consumptions to authenticated;

grant insert, update on table public.day_entries to authenticated;
grant insert, update on table public.foods to authenticated;
grant insert, delete on table public.food_consumptions to authenticated;
