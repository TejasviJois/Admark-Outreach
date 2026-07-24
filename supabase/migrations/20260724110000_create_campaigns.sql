-- Sprint 2: campaigns table
-- Source: docs/DATABASE.md

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  name text not null,
  description text,
  status text not null default 'DRAFT',
  target_country text,
  target_industry text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_status_check check (
    status in ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED')
  )
);

create index if not exists campaigns_tenant_id_idx on public.campaigns (tenant_id);
create index if not exists campaigns_status_idx on public.campaigns (tenant_id, status);

drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at
before update on public.campaigns
for each row
execute function public.set_updated_at();

alter table public.campaigns enable row level security;

drop policy if exists campaigns_select_own_tenant on public.campaigns;
create policy campaigns_select_own_tenant
on public.campaigns
for select
to authenticated
using (tenant_id = public.current_tenant_id());

drop policy if exists campaigns_insert_own_tenant on public.campaigns;
create policy campaigns_insert_own_tenant
on public.campaigns
for insert
to authenticated
with check (tenant_id = public.current_tenant_id());

drop policy if exists campaigns_update_own_tenant on public.campaigns;
create policy campaigns_update_own_tenant
on public.campaigns
for update
to authenticated
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());
