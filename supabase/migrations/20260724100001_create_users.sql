-- Foundation: users table (application profiles linked to Supabase Auth)
-- Source: docs/DATABASE.md

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create index if not exists users_tenant_id_idx on public.users (tenant_id);
create index if not exists users_auth_user_id_idx on public.users (auth_user_id);
create index if not exists users_email_idx on public.users (email);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();
