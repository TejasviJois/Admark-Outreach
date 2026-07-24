-- Sprint 3: email queue + sent emails

create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  generated_email_id uuid not null references public.generated_emails (id),
  scheduled_at timestamptz not null default now(),
  status text not null default 'PENDING',
  retry_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_queue_status_check check (
    status in ('PENDING', 'PROCESSING', 'SENT', 'FAILED')
  )
);

create unique index if not exists email_queue_active_generated_email_unique
on public.email_queue (generated_email_id)
where status in ('PENDING', 'PROCESSING');

create index if not exists email_queue_status_scheduled_idx
on public.email_queue (status, scheduled_at);

create table if not exists public.sent_emails (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  lead_id uuid not null references public.leads (id),
  generated_email_id uuid not null references public.generated_emails (id),
  provider_message_id text,
  sent_at timestamptz not null default now(),
  status text not null default 'SENT',
  created_at timestamptz not null default now(),
  constraint sent_emails_status_check check (
    status in ('SENT', 'FAILED', 'BOUNCED')
  )
);

create index if not exists sent_emails_lead_id_idx on public.sent_emails (lead_id);
create index if not exists sent_emails_generated_email_id_idx
on public.sent_emails (generated_email_id);

drop trigger if exists email_queue_set_updated_at on public.email_queue;
create trigger email_queue_set_updated_at
before update on public.email_queue
for each row execute function public.set_updated_at();

alter table public.email_queue enable row level security;
alter table public.sent_emails enable row level security;

drop policy if exists email_queue_select_own_tenant on public.email_queue;
create policy email_queue_select_own_tenant
on public.email_queue for select to authenticated
using (tenant_id = public.current_tenant_id());

drop policy if exists sent_emails_select_own_tenant on public.sent_emails;
create policy sent_emails_select_own_tenant
on public.sent_emails for select to authenticated
using (tenant_id = public.current_tenant_id());
