-- Seed single Version 1 tenant (Admark)
-- Source: docs/DATABASE.md, docs/sprints/SPRINT_01.md

insert into public.tenants (id, name, slug, plan, is_active)
values (
  '00000000-0000-4000-8000-000000000001',
  'Admark',
  'admark',
  'free',
  true
)
on conflict (slug) do nothing;
