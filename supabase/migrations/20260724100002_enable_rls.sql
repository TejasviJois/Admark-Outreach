-- Version 1 RLS: tenant isolation via current user's tenant_id
-- Source: docs/DATABASE.md (ROW LEVEL SECURITY)

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.users
  where auth_user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_tenant_id() from public;
grant execute on function public.current_tenant_id() to authenticated;
grant execute on function public.current_tenant_id() to service_role;

alter table public.tenants enable row level security;
alter table public.users enable row level security;

drop policy if exists tenants_select_own on public.tenants;
create policy tenants_select_own
on public.tenants
for select
to authenticated
using (id = public.current_tenant_id());

drop policy if exists users_select_own_tenant on public.users;
create policy users_select_own_tenant
on public.users
for select
to authenticated
using (tenant_id = public.current_tenant_id());

drop policy if exists users_update_own_tenant on public.users;
create policy users_update_own_tenant
on public.users
for update
to authenticated
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

-- Service role bypasses RLS by default; no insert policies for authenticated
-- in Version 1 (profile provisioning uses service role).
