-- Local dev seed (runs after migrations on `supabase db reset`).
-- Aligns with DEV_TENANT_ID / DEV_USER_ID in .env.local.

-- Dev organization (matches src/server/tenant/context.test.ts dev bypass UUID)
insert into public.organizations (id, name, slug)
values (
  '00000000-0000-4000-8000-0000000000aa',
  'Dev Organization',
  'dev-organization'
)
on conflict (id) do update set name = excluded.name, slug = excluded.slug;

-- Dev auth user: dev@local.test / devpassword123
-- Password hash via pgcrypto (Supabase local auth.users)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000099',
  'authenticated',
  'authenticated',
  'dev@local.test',
  extensions.crypt('devpassword123', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  '00000000-0000-4000-8000-000000000099',
  '00000000-0000-4000-8000-000000000099',
  format('{"sub":"%s","email":"dev@local.test"}', '00000000-0000-4000-8000-000000000099')::jsonb,
  'email',
  'dev@local.test',
  now(),
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name)
values (
  '00000000-0000-4000-8000-000000000099',
  'dev@local.test',
  'Dev User'
)
on conflict (id) do update set email = excluded.email, full_name = excluded.full_name;

insert into public.organization_members (organization_id, user_id, role)
values (
  '00000000-0000-4000-8000-0000000000aa',
  '00000000-0000-4000-8000-000000000099',
  'admin'
)
on conflict (organization_id, user_id) do nothing;
