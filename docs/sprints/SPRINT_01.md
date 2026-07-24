# SPRINT_01.md

> Phase: Project Foundation  
> Source of Truth: `docs/ROADMAP.md` (Phase 1), `docs/PROJECT_BIBLE.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API_CONTRACTS.md`  
> Status: Planned

---

# Sprint Goal

Establish the technical foundation required by every later feature: environment configuration, Supabase connectivity, authentication, base folder structure, shared utilities, and core architectural patterns (thin API routes, service layer, repository pattern, typed errors, logging).

This sprint delivers **infrastructure only**. No business features. No lead management. No campaigns, research, email, replies, or analytics.

---

# Development Tasks

## Environment & Tooling

1. Create `.env.example` documenting all required environment variables (Supabase URL, anon key, service role key, and any app-level flags). Do not commit secrets.
2. Add Zod as a project dependency and confirm it resolves cleanly with the existing TypeScript setup.
3. Implement a typed environment loader that validates required env vars with Zod at startup/use and fails fast with clear errors when misconfigured.

## Folder Structure & Shared Foundations

4. Create the approved base folder scaffolding (`lib/`, `config/`, `constants/`, `types/`, `utils/`, `schemas/`, `middleware/`, `providers/`, `repositories/`, `services/`, `app/api/`) without domain feature code.
5. Add shared TypeScript utility types and constants needed by infrastructure (e.g. API envelope shapes, common ID aliases). No domain models for leads/campaigns.
6. Implement a structured logger utility for consistent application logging (level, message, optional context).

## Supabase Integration

7. Create the server-side Supabase client helper used by API routes and server components.
8. Create the browser-side Supabase client helper used by client components.
9. Verify the app can establish a live database connection using the configured Supabase clients (smoke check only; no domain queries).

## Foundation Database Schema

10. Create the migration for the `tenants` table per `docs/DATABASE.md` (UUID PK, audit fields, no business domain tables).
11. Create the migration for the `users` table per `docs/DATABASE.md` (links to tenant + Supabase Auth user; audit fields; no lead/campaign tables).
12. Enable RLS on foundation tables and add the Version 1 tenant-isolation policy pattern described in `docs/DATABASE.md`.
13. Seed the single Version 1 tenant record (Admark) required for local and staging use.

## Authentication

14. Wire Supabase Auth session helpers for server-side request auth (read JWT/session, identify current auth user).
15. Implement auth route/page scaffolding sufficient to sign in and establish a session locally (no product dashboard features).
16. Implement the auth provider abstraction boundary under `providers/auth/` so services depend on an interface, not vendor calls directly.

## API Infrastructure

17. Implement shared success/error API response helpers matching the standard envelope in `docs/API_CONTRACTS.md`.
18. Implement typed domain error types and a shared API error translator (domain errors → HTTP status + envelope).
19. Create the `/api/v1` route namespace scaffolding (versioned API root only; no business resources).

## Core Architecture Patterns

20. Define the base repository contract/pattern (shared interface + conventions) without implementing lead/campaign repositories.
21. Define the base service-layer conventions (services own logic; APIs stay thin) without implementing domain services beyond auth profile.
22. Implement `UserRepository` for foundation user/profile persistence only (`users` / tenant join as needed for auth).
23. Implement `AuthService` (or equivalent settings/auth profile service) that returns the current user profile + tenant + role for authenticated requests.
24. Implement `GET /api/v1/auth/me` as a thin controller that validates auth, calls the service, and returns the standard response envelope.

## Deployment Readiness

25. Confirm the app builds and runs locally with env validation, Supabase clients, and auth session flow.
26. Confirm a Vercel deployment succeeds using the documented environment variables (no feature UI required beyond proving the foundation boots).

---

# Task Order

Execute tasks in this order. Do not start a task until its listed prerequisites in **Dependencies** are complete.

1. **1 → 2 → 3** — Environment contract and Zod validation first.
2. **4 → 5 → 6** — Folder structure and shared utilities.
3. **7 → 8 → 9** — Supabase clients and connection smoke check.
4. **10 → 11 → 12 → 13** — Foundation schema, RLS, seed tenant.
5. **14 → 15 → 16** — Auth session helpers, sign-in scaffolding, auth provider boundary.
6. **17 → 18 → 19** — API envelope, error handling, versioned API root.
7. **20 → 21 → 22 → 23 → 24** — Architecture patterns, then auth profile stack (`auth/me`).
8. **25 → 26** — Local verification, then Vercel deployment verification.

---

# Dependencies

| Task | Depends On |
|------|------------|
| 1 | None |
| 2 | None |
| 3 | 1, 2 |
| 4 | None (can parallel with 1–3) |
| 5 | 4 |
| 6 | 4 |
| 7 | 3, 4 |
| 8 | 3, 4 |
| 9 | 7, 8 |
| 10 | 9 |
| 11 | 10 |
| 12 | 11 |
| 13 | 12 |
| 14 | 7, 8 |
| 15 | 14 |
| 16 | 14 |
| 17 | 5 |
| 18 | 5, 6 |
| 19 | 17, 18 |
| 20 | 4, 5 |
| 21 | 20 |
| 22 | 11, 20 |
| 23 | 16, 21, 22 |
| 24 | 19, 23 |
| 25 | 15, 24 |
| 26 | 25 |

External dependencies:

- Supabase project available (URL + keys)
- Vercel project available for deployment verification
- No Phase 2+ feature work may begin until this sprint’s Definition of Done is met

---

# Acceptance Criteria

- Application runs locally with validated environment configuration.
- Supabase server and browser clients are configured and can connect to the database.
- Foundation tables (`tenants`, `users`) exist per `docs/DATABASE.md`, with RLS enabled for Version 1 tenant isolation.
- Single seed tenant (Admark) exists.
- Supabase Auth sign-in establishes a usable session.
- `GET /api/v1/auth/me` returns the authenticated user profile, tenant information, and role using the standard API envelope; unauthenticated requests return `401`.
- API routes remain thin; business/profile logic lives in the service layer; persistence lives in repositories.
- Shared logging and typed error handling are available to future features.
- Provider boundary exists for auth (replaceable provider pattern established).
- Project builds successfully and deploys to Vercel.
- No lead, campaign, research, email, reply, or analytics features are implemented.

---

# Definition of Done

This sprint is done when all of the following are true:

1. Every numbered development task (1–26) is completed and verifiable.
2. All Acceptance Criteria are satisfied.
3. Changes remain aligned with `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, and `docs/API_CONTRACTS.md` with no architecture redesign and no schema beyond foundation tables.
4. Code follows `docs/CODING_STANDARDS.md` (strong typing, modular boundaries, no duplicated infrastructure helpers).
5. The foundation is modular, serverless-friendly, and ready for Phase 2 (Lead Management) without rework of core patterns.
6. No business feature scope from later roadmap phases is included.
