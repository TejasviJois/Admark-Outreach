-- Sprint 3: company_research + ai_tasks

create table if not exists public.company_research (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  lead_id uuid not null references public.leads (id),
  summary text,
  products jsonb not null default '[]'::jsonb,
  pain_points jsonb not null default '[]'::jsonb,
  opportunities jsonb not null default '[]'::jsonb,
  confidence_score numeric,
  status text not null default 'PENDING',
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_research_status_check check (
    status in ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')
  ),
  constraint company_research_lead_unique unique (lead_id)
);

create index if not exists company_research_tenant_id_idx
on public.company_research (tenant_id);

create table if not exists public.ai_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  task_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  model text,
  status text not null default 'PENDING',
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_tasks_status_check check (
    status in ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')
  )
);

create index if not exists ai_tasks_tenant_id_idx on public.ai_tasks (tenant_id);
create index if not exists ai_tasks_status_idx on public.ai_tasks (status);
create index if not exists ai_tasks_entity_idx
on public.ai_tasks (entity_type, entity_id);

drop trigger if exists company_research_set_updated_at on public.company_research;
create trigger company_research_set_updated_at
before update on public.company_research
for each row execute function public.set_updated_at();

drop trigger if exists ai_tasks_set_updated_at on public.ai_tasks;
create trigger ai_tasks_set_updated_at
before update on public.ai_tasks
for each row execute function public.set_updated_at();

alter table public.company_research enable row level security;
alter table public.ai_tasks enable row level security;

drop policy if exists company_research_select_own_tenant on public.company_research;
create policy company_research_select_own_tenant
on public.company_research for select to authenticated
using (tenant_id = public.current_tenant_id());

drop policy if exists ai_tasks_select_own_tenant on public.ai_tasks;
create policy ai_tasks_select_own_tenant
on public.ai_tasks for select to authenticated
using (tenant_id = public.current_tenant_id());
