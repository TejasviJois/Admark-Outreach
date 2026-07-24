-- Sprint 3: email templates + generated emails

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  name text not null,
  subject_template text not null,
  body_template text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_templates_tenant_id_idx
on public.email_templates (tenant_id);

create table if not exists public.generated_emails (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  lead_id uuid not null references public.leads (id),
  template_id uuid references public.email_templates (id),
  subject text not null,
  body text not null,
  generation_model text,
  generation_version text,
  created_at timestamptz not null default now()
);

create index if not exists generated_emails_tenant_id_idx
on public.generated_emails (tenant_id);
create index if not exists generated_emails_lead_id_idx
on public.generated_emails (lead_id);

drop trigger if exists email_templates_set_updated_at on public.email_templates;
create trigger email_templates_set_updated_at
before update on public.email_templates
for each row execute function public.set_updated_at();

alter table public.email_templates enable row level security;
alter table public.generated_emails enable row level security;

drop policy if exists email_templates_select_own_tenant on public.email_templates;
create policy email_templates_select_own_tenant
on public.email_templates for select to authenticated
using (tenant_id = public.current_tenant_id());

drop policy if exists generated_emails_select_own_tenant on public.generated_emails;
create policy generated_emails_select_own_tenant
on public.generated_emails for select to authenticated
using (tenant_id = public.current_tenant_id());

insert into public.email_templates (
  tenant_id,
  name,
  subject_template,
  body_template,
  is_default
)
select
  t.id,
  'Default Outreach',
  'Quick idea for {{company_name}}',
  'Hi {{first_name}},\n\nI researched {{company_name}} and noticed opportunities around {{opportunities}}.\n\nWould you be open to a short chat?\n\nBest,\nAdmark',
  true
from public.tenants t
where t.slug = 'admark'
  and not exists (
    select 1
    from public.email_templates et
    where et.tenant_id = t.id
      and et.is_default = true
  );
