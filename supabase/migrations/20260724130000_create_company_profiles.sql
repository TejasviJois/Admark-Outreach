-- Structured company profiles from deterministic enrichment (not LLM research)

create table if not exists public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  lead_id uuid not null references public.leads (id),
  company_name text,
  industry text,
  website text,
  about text,
  services jsonb not null default '[]'::jsonb,
  team_size integer,
  location text,
  technologies jsonb not null default '[]'::jsonb,
  contact_email text,
  linkedin_url text,
  social_links jsonb not null default '{}'::jsonb,
  source_pages jsonb not null default '[]'::jsonb,
  status text not null default 'PENDING',
  extracted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_profiles_status_check check (
    status in ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')
  ),
  constraint company_profiles_lead_unique unique (lead_id)
);

create index if not exists company_profiles_tenant_id_idx
on public.company_profiles (tenant_id);

drop trigger if exists company_profiles_set_updated_at on public.company_profiles;
create trigger company_profiles_set_updated_at
before update on public.company_profiles
for each row execute function public.set_updated_at();

alter table public.company_profiles enable row level security;

drop policy if exists company_profiles_select_own_tenant on public.company_profiles;
create policy company_profiles_select_own_tenant
on public.company_profiles for select to authenticated
using (tenant_id = public.current_tenant_id());
