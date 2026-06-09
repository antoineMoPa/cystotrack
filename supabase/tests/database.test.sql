begin;
select plan(8);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'one@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'two@example.com', '', now(), '{}', '{}', now(), now());

select is((select count(*)::int from public.profiles), 2, 'profiles are created for users');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.save_day_entry('2026-06-09', 2, 4, 3, 5, 7.5, 2250, 'test', '[{"food_name":"Pomme","meal_period":"morning"}]'::jsonb)$$,
  'user can save a day'
);
select is((select count(*)::int from public.day_entries), 1, 'user sees own day');
select is((select count(*)::int from public.foods), 1, 'food is created');
select is((select count(*)::int from public.food_consumptions), 1, 'consumption is created');
select lives_ok(
  $$select public.save_day_entry('2026-06-09', 3, 5, 4, 6, 8, 2250, null, '[{"food_name":"pomme","meal_period":"lunch"}]'::jsonb)$$,
  'case-insensitive food is reused'
);
select is((select count(*)::int from public.foods), 1, 'case variant did not duplicate food');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select is((select count(*)::int from public.day_entries), 0, 'another user cannot see the day');

select * from finish();
rollback;
