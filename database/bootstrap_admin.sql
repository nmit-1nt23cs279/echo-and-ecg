-- One-time: make YOUR account an administrator.
-- 1. Sign up in the app and confirm your email.
-- 2. Supabase → Authentication → Users → copy your User UID.
-- 3. Replace the placeholder below, then run in SQL Editor.
insert into public.user_roles (user_id, role)
values ('00000000-0000-0000-0000-000000000000', 'admin')
on conflict (user_id, role) do nothing;
