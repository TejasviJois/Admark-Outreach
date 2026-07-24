# SPRINT_02.md

> Phase: Lead Management  
> Source of Truth: `docs/ROADMAP.md` (Phase 2), `docs/PROJECT_BIBLE.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API_CONTRACTS.md`  
> Status: Planned  
> Prerequisite: Sprint 1 (Project Foundation) complete

---

# Sprint Goal

Deliver the first business capabilities: import leads into the platform, store them correctly, reject invalid and duplicate data, and manage leads through list, retrieve, update, status, and soft-delete (archive) flows.

This sprint builds on Sprint 1 infrastructure. It does **not** rework foundation setup, authentication scaffolding, shared API envelopes, or core architecture patterns. It does **not** implement research, email generation, queueing, sending, replies, or analytics.

---

# Development Tasks

## Lead Domain Types & Validation

1. Define lead domain types and enums (`lead_status`, `research_status`) per `docs/DATABASE.md` / `docs/API_CONTRACTS.md`.
2. Create Zod schemas for lead create/update payloads (email format, URL format, status enums, required fields).
3. Create Zod schemas for lead list query params (campaignId, status, page, limit, search) with pagination bounds.
4. Create Zod schemas for lead import input (supported CSV columns, required headers, row-level field rules).

## Campaign Prerequisite (Lead Organization Only)

5. Create the migration for the `campaigns` table per `docs/DATABASE.md` (required FK target for leads; no analytics columns beyond schema).
6. Enable RLS on `campaigns` using the existing Version 1 tenant-isolation pattern.
7. Implement `CampaignRepository` with create and find-by-id (and tenant-scoped list) only—no activate/pause/archive campaign workflows.
8. Implement a minimal `CampaignService` for create campaign and list campaigns (enough to attach imported leads to a campaign).
9. Implement `POST /api/v1/campaigns` and `GET /api/v1/campaigns` as thin controllers matching `docs/API_CONTRACTS.md` (create + list only).

## Leads Schema & Persistence

10. Create the migration for the `leads` table per `docs/DATABASE.md` (UUID PK, tenant_id, campaign_id, soft delete, audit fields, lead/research status).
11. Add lead indexes and the tenant-scoped unique constraint on `(tenant_id, email)` per `docs/DATABASE.md`.
12. Enable RLS on `leads` using the existing Version 1 tenant-isolation pattern.
13. Implement `LeadRepository` methods: create, createMany, findById, findMany (filters + pagination), update, softDelete, findByEmailInTenant.

## Lead Import Workflow

14. Implement CSV parse utility that reads upload input and maps rows to validated lead import DTOs (no UI polish beyond workable upload acceptance).
15. Implement import validation workflow: reject missing file, unsupported format, missing columns, and invalid rows with clear error codes.
16. Implement duplicate prevention in `LeadService`: detect existing `(tenant_id, email)` conflicts and return conflict/summary behavior aligned with `docs/API_CONTRACTS.md`.
17. Implement `LeadService.importLeads` orchestration (validate → dedupe → persist via repository → return import summary).
18. Implement `POST /api/v1/leads/import` as a thin authenticated controller returning import summary (`201` / `400` / `409` as specified).

## Lead Management APIs

19. Implement `LeadService.listLeads` with campaign, status, search, and pagination support.
20. Implement `GET /api/v1/leads` as a thin authenticated controller.
21. Implement `LeadService.getLeadById` with tenant-scoped not-found handling.
22. Implement `GET /api/v1/leads/{leadId}` as a thin authenticated controller.
23. Implement `LeadService.updateLead` (field updates + status enum validation; no research/email side effects).
24. Implement `PATCH /api/v1/leads/{leadId}` as a thin authenticated controller.
25. Implement `LeadService.archiveLead` (soft delete via `deleted_at`; set archived status as defined by schema/standards).
26. Implement `DELETE /api/v1/leads/{leadId}` as a thin authenticated controller (soft delete).

## Verification

27. Verify end-to-end: create campaign → import valid CSV → list/get/update/archive lead; confirm invalid CSV and duplicate email paths fail correctly.
28. Confirm all new lead/campaign endpoints require auth (`401` when unauthenticated) and remain tenant-scoped.

---

# Task Order

Execute tasks in this order. Do not start a task until its listed prerequisites in **Dependencies** are complete.

1. **1 → 2 → 3 → 4** — Domain types and Zod schemas.
2. **5 → 6 → 7 → 8 → 9** — Minimal campaign support (FK prerequisite).
3. **10 → 11 → 12 → 13** — Leads schema, constraints, repository.
4. **14 → 15 → 16 → 17 → 18** — Import pipeline and import API.
5. **19 → 20 → 21 → 22 → 23 → 24 → 25 → 26** — Lead management service methods and APIs.
6. **27 → 28** — End-to-end and auth/tenant verification.

---

# Dependencies

| Task | Depends On |
|------|------------|
| 1 | Sprint 1 complete |
| 2 | 1 |
| 3 | 1 |
| 4 | 1, 2 |
| 5 | Sprint 1 complete |
| 6 | 5 |
| 7 | 6 |
| 8 | 7 |
| 9 | 8 |
| 10 | 5 |
| 11 | 10 |
| 12 | 11 |
| 13 | 12, 2 |
| 14 | 4 |
| 15 | 14 |
| 16 | 13, 15 |
| 17 | 16 |
| 18 | 9, 17 |
| 19 | 13, 3 |
| 20 | 19 |
| 21 | 13 |
| 22 | 21 |
| 23 | 13, 2 |
| 24 | 23 |
| 25 | 13 |
| 26 | 25 |
| 27 | 18, 20, 22, 24, 26 |
| 28 | 27 |

External / phase dependencies:

- Sprint 1 Definition of Done must be met (auth, API envelope, repository/service patterns, foundation schema).
- No Phase 3+ work (research, email, replies, analytics) may begin until this sprint’s Definition of Done is met.

Out of scope (explicit non-overlap with Sprint 1 and later phases):

- Env/Zod bootstrap, Supabase clients, auth scaffolding, shared error/logger utilities, base repository/service conventions (Sprint 1)
- AI research, email templates/generation, queue/send, reply classification, campaign activate/pause/metrics, analytics dashboards (later sprints)

---

# Acceptance Criteria

- `campaigns` and `leads` tables exist per `docs/DATABASE.md`, with RLS and tenant isolation.
- Leads enforce unique `(tenant_id, email)`.
- A campaign can be created and listed so imported leads can be associated with a campaign.
- Valid CSV import creates stored leads with correct fields and initial statuses.
- Invalid imports are rejected (missing file, bad format, missing columns, invalid rows).
- Duplicate emails within a tenant are prevented / reported per API contract (`409` / import summary behavior).
- Authenticated clients can list, get, update, and soft-delete (archive) leads.
- Lead list supports campaign, status, search, and pagination filters.
- Lead updates validate email, URL, and status enums.
- All lead and campaign endpoints require authentication and return the standard API envelope.
- API routes remain thin; import/validation/duplicate logic lives in `LeadService`; persistence lives in repositories.
- No research, email, reply, or analytics features are implemented.
- No Sprint 1 foundation work is redesigned.

---

# Definition of Done

This sprint is done when all of the following are true:

1. Every numbered development task (1–28) is completed and verifiable.
2. All Acceptance Criteria are satisfied.
3. Changes remain aligned with `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, and `docs/API_CONTRACTS.md` with no architecture redesign.
4. Schema changes are limited to Phase 2 needs (`campaigns`, `leads`) and do not add later-phase tables.
5. Code follows `docs/CODING_STANDARDS.md` (thin routes, service-layer business logic, repository persistence, strong typing).
6. Lead management is usable end-to-end and ready for Phase 3 (AI Research & Email Generation) without rework of import or lead CRUD patterns.
7. No scope from Sprint 1 or from Phase 3+ roadmap items is included.
