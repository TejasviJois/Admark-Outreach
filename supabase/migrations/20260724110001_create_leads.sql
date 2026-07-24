-- Sprint 2: leads table
-- Source: docs/DATABASE.md

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  campaign_id uuid not null references public.campaigns (id),
  company_name text not null,
  website text,
  first_name text,
  last_name text,
  email text not null,
  linkedin_url text,
  industry text,
  country text,
  employee_count integer,
  lead_status text not null default 'NEW',
  research_status text not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint leads_lead_status_check check (
    lead_status in (
      'NEW',
      'RESEARCHING',
      'READY',
      'QUEUED',
      'EMAILED',
      'REPLIED',
      'BOUNCED',
      'UNSUBSCRIBED',
      'FAILED',
      'ARCHIVED'
    )
  ),
  constraint leads_research_status_check check (
    research_status in ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')
  )
);

create unique index if not exists leads_tenant_email_unique
on public.leads (tenant_id, email)
where deleted_at is null;

create index if not exists leads_tenant_id_idx on public.leads (tenant_id);
create index if not exists leads_campaign_id_idx on public.leads (campaign_id);
create index if not exists leads_email_idx on public.leads (email);
create index if not exists leads_company_name_idx on public.leads (company_name);
create index if not exists leads_lead_status_idx on public.leads (lead_status);
create index if not exists leads_research_status_idx on public.leads (research_status);

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row
execute function public.set_updated_at();

alter table public.leads enable row level security;

drop policy if exists leads_select_own_tenant on public.leads;
create policy leads_select_own_tenant
on public.leads
for select
to authenticated
using (tenant_id = public.current_tenant_id());

drop policy if exists leads_insert_own_tenant on public.leads;
create policy leads_insert_own_tenant
on public.leads
for insert
to authenticated
with check (tenant_id = public.current_tenant_id());

drop policy if exists leads_update_own_tenant on public.leads;
create policy leads_update_own_tenant
on public.leads
for update
to authenticated
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());
