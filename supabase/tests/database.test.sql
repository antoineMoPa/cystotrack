begin;
select plan(15);

delete from auth.users
where id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'one@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'two@example.com', '', now(), '{}', '{}', now(), now());

select is((
  select count(*)::int
  from public.profiles
  where id in (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002'
  )
), 2, 'profiles are created for users');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.save_day_entry('2026-06-09', 2::smallint, 4::smallint, 3::smallint, 5::smallint, 7.5::numeric, 2250, 'test', '[{"name":"Déjeuner","meal_period":"morning","ingredients":[{"food_name":"Pomme","quantity":1,"measure_unit":"cup"}]}]'::jsonb)$$,
  'user can save a day'
);
select is((select count(*)::int from public.day_entries), 1, 'user sees own day');
select is((select count(*)::int from public.foods), 1, 'food is created');
select is((select count(*)::int from public.plates), 1, 'plate is created');
select is((select count(*)::int from public.plate_ingredients), 1, 'plate ingredient is created');
select ok(has_table_privilege('authenticated', 'public.day_entries', 'select'), 'authenticated can read days');
select ok(has_table_privilege('authenticated', 'public.foods', 'select'), 'authenticated can read foods');
select ok(has_table_privilege('authenticated', 'public.plates', 'select'), 'authenticated can read plates');
select ok(has_table_privilege('authenticated', 'public.plate_ingredients', 'select'), 'authenticated can read plate ingredients');
select lives_ok(
  $$select public.save_day_entry('2026-06-09', 3::smallint, 5::smallint, 4::smallint, 6::smallint, 8::numeric, 2250, null, '[{"name":"Dîner","meal_period":"lunch","ingredients":[{"food_name":"pomme"}]}]'::jsonb)$$,
  'case-insensitive food is reused'
);
select is((select count(*)::int from public.foods), 1, 'case variant did not duplicate food');
select is((select count(*)::int from public.plates), 1, 'saving replaces plates');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select is((select count(*)::int from public.day_entries), 0, 'another user cannot see the day');
select is((select count(*)::int from public.plates), 0, 'another user cannot see plates');

select * from finish();
rollback;
