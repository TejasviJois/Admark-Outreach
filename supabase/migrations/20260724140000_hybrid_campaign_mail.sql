-- Hybrid Campaign Mail: companies, profile score, crawl_jobs, campaign template

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  website text,
  website_normalized text,
  company_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists companies_tenant_website_normalized_uidx
on public.companies (tenant_id, website_normalized)
where website_normalized is not null;

create index if not exists companies_tenant_id_idx on public.companies (tenant_id);

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

alter table public.companies enable row level security;

drop policy if exists companies_select_own_tenant on public.companies;
create policy companies_select_own_tenant
on public.companies for select to authenticated
using (tenant_id = public.current_tenant_id());

-- Ensure company_profiles exists (also created in 20260724130000)
create table if not exists public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  lead_id uuid references public.leads (id),
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
  updated_at timestamptz not null default now()
);

alter table public.company_profiles
  add column if not exists company_id uuid references public.companies (id);

alter table public.company_profiles
  add column if not exists profile_quality_score integer;

alter table public.company_profiles
  drop constraint if exists company_profiles_status_check;

alter table public.company_profiles
  add constraint company_profiles_status_check check (
    status in ('PENDING', 'RUNNING', 'COMPLETED', 'INCOMPLETE', 'FAILED')
  );

alter table public.company_profiles
  drop constraint if exists company_profiles_score_check;

alter table public.company_profiles
  add constraint company_profiles_score_check check (
    profile_quality_score is null
    or (profile_quality_score >= 0 and profile_quality_score <= 100)
  );

create unique index if not exists company_profiles_company_id_uidx
on public.company_profiles (company_id)
where company_id is not null;

create unique index if not exists company_profiles_lead_id_uidx
on public.company_profiles (lead_id)
where lead_id is not null;

drop trigger if exists company_profiles_set_updated_at on public.company_profiles;
create trigger company_profiles_set_updated_at
before update on public.company_profiles
for each row execute function public.set_updated_at();

alter table public.company_profiles enable row level security;

drop policy if exists company_profiles_select_own_tenant on public.company_profiles;
create policy company_profiles_select_own_tenant
on public.company_profiles for select to authenticated
using (tenant_id = public.current_tenant_id());

-- Crawl history
create table if not exists public.crawl_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  company_id uuid references public.companies (id),
  lead_id uuid references public.leads (id),
  website text,
  status text not null default 'PENDING',
  source_pages jsonb not null default '[]'::jsonb,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint crawl_jobs_status_check check (
    status in ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED')
  )
);

create index if not exists crawl_jobs_tenant_id_idx on public.crawl_jobs (tenant_id);
create index if not exists crawl_jobs_lead_id_idx on public.crawl_jobs (lead_id);

alter table public.crawl_jobs enable row level security;

drop policy if exists crawl_jobs_select_own_tenant on public.crawl_jobs;
create policy crawl_jobs_select_own_tenant
on public.crawl_jobs for select to authenticated
using (tenant_id = public.current_tenant_id());

-- Campaign default template
alter table public.campaigns
  add column if not exists default_template_id uuid references public.email_templates (id);

-- Lead → company link
alter table public.leads
  add column if not exists company_id uuid references public.companies (id);

create index if not exists leads_company_id_idx on public.leads (company_id);

-- Seed industry-style templates for Admark tenant (library; campaign picks one)
insert into public.email_templates (
  tenant_id,
  name,
  subject_template,
  body_template,
  is_default
)
select
  t.id,
  v.name,
  v.subject_template,
  v.body_template,
  false
from public.tenants t
cross join (
  values
    (
      'Cafe / Hospitality',
      'Idea for {{company_name}} in {{location}}',
      E'Hi {{first_name}},\n\nI came across {{company_name}} and liked what you offer around {{service_1}}{{service_2}}.\n\nWe help local hospitality brands get more booked tables with focused digital campaigns.\n\nOpen to a quick chat?\n\nBest,\nAdmark'
    ),
    (
      'SaaS / Software',
      'Quick note for {{company_name}}',
      E'Hi {{first_name}},\n\nI reviewed {{company_name}} ({{industry}}) and your work on {{service_1}}.\n\nWe partner with software teams to generate qualified pipeline with personalized outreach.\n\nWorth a 15-minute call?\n\nBest,\nAdmark'
    ),
    (
      'Agency / Services',
      '{{company_name}} — collaboration idea',
      E'Hi {{first_name}},\n\n{{company_name}} looks strong in {{service_1}} out of {{location}}.\n\nWe help agencies fill capacity with targeted B2B outreach.\n\nInterested in comparing notes?\n\nBest,\nAdmark'
    )
) as v(name, subject_template, body_template)
where t.slug = 'admark'
  and not exists (
    select 1 from public.email_templates et
    where et.tenant_id = t.id and et.name = v.name
  );

-- Refresh default template body placeholders for Hybrid Campaign Mail
update public.email_templates
set
  subject_template = 'Quick idea for {{company_name}}',
  body_template = E'Hi {{first_name}},\n\nI noticed {{company_name}}{{industry}}{{location}} and your focus on {{service_1}}{{service_2}}.\n\nWould you be open to a short chat about growing inbound demand?\n\nBest,\nAdmark'
where name = 'Default Outreach';
