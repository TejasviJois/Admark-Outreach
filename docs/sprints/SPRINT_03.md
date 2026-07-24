# SPRINT_03.md

> Phase: AI Workflows, Email Automation & Production Readiness  
> Source of Truth: `docs/ROADMAP.md` (Phases 3–7), `docs/PROJECT_BIBLE.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API_CONTRACTS.md`, `docs/AI_GUIDELINES.md`  
> Status: Planned  
> Prerequisite: Sprint 1 (Foundation) and Sprint 2 (Lead Management) complete

---

# Sprint Goal

Complete the outreach loop and harden the system for production: AI company research, personalized email generation, email queueing and sending, inbound reply ingestion and AI classification, campaign tracking/analytics, and production stability/deployment readiness.

This sprint builds on Sprint 1 infrastructure and Sprint 2 lead/campaign basics. It does **not** rework foundation setup, auth scaffolding, lead import/CRUD patterns, or approved architecture. It does **not** add out-of-scope product surfaces (CRM, billing, LinkedIn, WhatsApp, team collaboration).

---

# Development Tasks

## AI Provider & Prompt Foundations

1. Define AI domain types/enums (`research_status`, AI task status, reply classification values) per `docs/DATABASE.md` and `docs/AI_GUIDELINES.md`.
2. Implement the AI provider interface under `providers/ai/` (generate research, generate email, classify reply) with no vendor calls in services.
3. Implement the Gemini AI provider adapter behind that interface (structured JSON outputs only).
4. Add Zod schemas for AI structured outputs (research result, generated email, reply classification) with `additionalProperties: false` discipline.
5. Create versioned prompt registry entries for research, email generation, and reply classification per `docs/AI_GUIDELINES.md` naming (`[domain].[task].v[major].[minor]`).
6. Implement shared AI output validation + bounded retry helper (syntax → schema → business rules; max 2 retries; fallback path).

## Research Domain Schema & Persistence

7. Create the migration for `company_research` per `docs/DATABASE.md`.
8. Create the migration for `ai_tasks` per `docs/DATABASE.md`.
9. Enable RLS on `company_research` and `ai_tasks` using the Version 1 tenant-isolation pattern.
10. Implement `ResearchRepository` (create/update/findByLeadId) and `AiTaskRepository` (create/update/findByEntity).

## Company Research Workflow

11. Implement `ResearchService.generateResearch` (create AI task, call AI provider, validate output, persist research, update lead research/lead status).
12. Implement AI failure fallback for research (mark task/research failed; safe lead status; no partial corrupt writes).
13. Implement `POST /api/v1/research/{leadId}` as a thin authenticated controller.
14. Implement `GET /api/v1/research/{leadId}` as a thin authenticated controller.
15. Implement internal `POST /api/v1/internal/research` trigger endpoint for trusted server orchestration.

## Email Templates & Generation Schema

16. Create the migration for `email_templates` per `docs/DATABASE.md`.
17. Create the migration for `generated_emails` per `docs/DATABASE.md`.
18. Enable RLS on `email_templates` and `generated_emails`.
19. Implement `EmailTemplateRepository` and `GeneratedEmailRepository`.
20. Implement Zod schemas for email template CRUD and email generate/queue/send request bodies.
21. Implement `EmailService` template methods (list/create/update/delete) and thin template API routes per `docs/API_CONTRACTS.md`.
22. Implement `EmailService.generateEmail` (require lead + research + template; validate AI output; persist generated email with model/version metadata).
23. Implement conditional idempotency for generation (return existing generated content unless regeneration is requested).
24. Implement `POST /api/v1/emails/generate` as a thin authenticated controller.
25. Implement internal `POST /api/v1/internal/email-generation` trigger endpoint.

## Email Provider, Queue & Sending

26. Implement the email provider interface under `providers/email/` (send, normalize delivery errors).
27. Implement the concrete email provider adapter for Version 1 sending.
28. Create the migration for `email_queue` per `docs/DATABASE.md`.
29. Create the migration for `sent_emails` per `docs/DATABASE.md`.
30. Enable RLS on `email_queue` and `sent_emails`.
31. Implement `EmailQueueRepository` and `SentEmailRepository`.
32. Implement `EmailService.queueEmail` with duplicate active-queue prevention for the same generated email.
33. Implement `POST /api/v1/emails/queue` as a thin authenticated controller.
34. Implement `EmailService.sendQueuedEmail` (provider send, persist sent metadata, update queue/lead status, handle failures without duplicate sends).
35. Implement `POST /api/v1/emails/send` as a thin authenticated controller (idempotent for already-sent).
36. Implement cron-authenticated `POST /api/v1/cron/process-email-queue` to process pending queue items safely after interruption.
37. Implement cron-authenticated `POST /api/v1/cron/retry-emails` for failed delivery retries with retry_count/last_error tracking.
38. Implement delivery status webhook `POST /api/v1/webhooks/email/status` with signature verification and idempotent status updates.

## Reply Ingestion & Classification

39. Create the migration for `email_replies` per `docs/DATABASE.md`.
40. Enable RLS on `email_replies`.
41. Implement `ReplyRepository` (create, findById, findMany, updateClassification, findByProviderEventId or equivalent idempotency key).
42. Implement inbound email webhook `POST /api/v1/webhooks/email/inbound` with signature verification, required-field validation, and duplicate-event protection.
43. Implement `ReplyService.ingestReply` (store reply, associate to sent email/lead, pause further automated outreach for that lead per product rules).
44. Implement `ReplyService.classifyReply` (AI classification via provider, validate enum, persist classification/confidence, update lead status).
45. Implement classification fallback to a safe human-review category when AI validation fails after retries.
46. Implement `GET /api/v1/replies` and `GET /api/v1/replies/{replyId}` as thin authenticated controllers.
47. Implement `POST /api/v1/replies/{replyId}/classify` as a thin authenticated controller.
48. Implement internal `POST /api/v1/internal/reply-classification` trigger endpoint.

## Campaign Tracking & Analytics

49. Extend campaign service/repository as needed for status transitions used by tracking (activate/pause/complete/archive) without redesigning Sprint 2 create/list.
50. Implement campaign progress aggregation from persisted lead/email/reply records (no duplicate metrics storage).
51. Implement `GET /api/v1/campaigns/{campaignId}` and campaign update/archive routes still missing from Sprint 2, aligned with `docs/API_CONTRACTS.md`.
52. Implement `AnalyticsService` for campaign analytics and dashboard summaries derived from persisted data.
53. Implement `GET /api/v1/analytics/campaigns` as a thin authenticated controller.
54. Implement `GET /api/v1/analytics/dashboard` as a thin authenticated controller.
55. Implement a minimal analytics dashboard UI that displays the documented operational metrics (no marketing chrome / unrelated widgets).

## Settings, Activity Logging & Maintenance

56. Create the migration for `system_settings` and `activity_logs` per `docs/DATABASE.md`.
57. Enable RLS on `system_settings` and `activity_logs`.
58. Implement `SettingsRepository` / `SettingsService` and `GET/PATCH /api/v1/settings` per API contracts.
59. Implement activity logging for authentication, campaign/lead lifecycle, AI operations, email delivery, and reply processing categories.
60. Implement cron-authenticated `POST /api/v1/cron/cleanup` for soft-delete/maintenance tasks.

## Production Readiness

61. Review and harden validation on all Sprint 3 public endpoints (auth, zod, envelope errors, tenant scoping).
62. Improve structured logging/diagnostics for AI failures, provider send failures, webhook signature failures, and cron runs.
63. Add golden-dataset smoke checks or automated validation harness for research/email/classification JSON schema adherence.
64. Verify end-to-end happy path: research → generate email → queue → send → ingest reply → classify → analytics update.
65. Verify failure paths: missing research blocks email generation; duplicate queue prevented; webhook replay idempotent; cron does not double-send.
66. Perform production deployment verification on Vercel with required secrets (AI, email provider, cron, webhook) and confirm acceptable operational overhead.

---

# Task Order

Execute tasks in this order. Do not start a task until its listed prerequisites in **Dependencies** are complete.

1. **1 → 2 → 3 → 4 → 5 → 6** — AI provider, schemas, prompts, validation/retry.
2. **7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15** — Research schema, service, APIs.
3. **16 → 17 → 18 → 19 → 20 → 21 → 22 → 23 → 24 → 25** — Templates + email generation.
4. **26 → 27 → 28 → 29 → 30 → 31 → 32 → 33 → 34 → 35 → 36 → 37 → 38** — Provider, queue, send, cron, delivery webhook.
5. **39 → 40 → 41 → 42 → 43 → 44 → 45 → 46 → 47 → 48** — Reply ingest + classification.
6. **49 → 50 → 51 → 52 → 53 → 54 → 55** — Campaign tracking + analytics.
7. **56 → 57 → 58 → 59 → 60** — Settings, activity logs, cleanup cron.
8. **61 → 62 → 63 → 64 → 65 → 66** — Hardening, verification, production deploy.

---

# Dependencies

| Task | Depends On |
|------|------------|
| 1 | Sprint 1–2 complete |
| 2 | 1 |
| 3 | 2 |
| 4 | 1 |
| 5 | 4 |
| 6 | 3, 4, 5 |
| 7 | Sprint 2 leads schema |
| 8 | Sprint 1 foundation schema |
| 9 | 7, 8 |
| 10 | 9 |
| 11 | 6, 10 |
| 12 | 11 |
| 13 | 11 |
| 14 | 10 |
| 15 | 11 |
| 16 | Sprint 1 foundation schema |
| 17 | 7 |
| 18 | 16, 17 |
| 19 | 18 |
| 20 | 1 |
| 21 | 19, 20 |
| 22 | 6, 11, 19, 21 |
| 23 | 22 |
| 24 | 23 |
| 25 | 22 |
| 26 | Sprint 1 provider pattern |
| 27 | 26 |
| 28 | 17 |
| 29 | 17 |
| 30 | 28, 29 |
| 31 | 30 |
| 32 | 31 |
| 33 | 32 |
| 34 | 27, 31, 32 |
| 35 | 34 |
| 36 | 34 |
| 37 | 34 |
| 38 | 31 |
| 39 | 29 |
| 40 | 39 |
| 41 | 40 |
| 42 | 41 |
| 43 | 42 |
| 44 | 6, 41, 43 |
| 45 | 44 |
| 46 | 41 |
| 47 | 44 |
| 48 | 44 |
| 49 | Sprint 2 campaign create/list |
| 50 | 34, 43 |
| 51 | 49, 50 |
| 52 | 50 |
| 53 | 52 |
| 54 | 52 |
| 55 | 54 |
| 56 | Sprint 1 foundation schema |
| 57 | 56 |
| 58 | 57 |
| 59 | 57 |
| 60 | 57 |
| 61 | 24, 35, 47, 54, 58 |
| 62 | 61 |
| 63 | 6, 22, 44 |
| 64 | 55, 61 |
| 65 | 36, 37, 38, 42, 64 |
| 66 | 65 |

External / phase dependencies:

- Sprint 1 and Sprint 2 Definitions of Done must be met.
- Gemini (or configured AI) credentials available.
- Email provider credentials and webhook signing secrets available.
- Cron secret configured for scheduled endpoints.
- Vercel project available for final production verification.

Out of scope (non-overlap):

- Sprint 1 foundation/auth/API envelope/base patterns
- Sprint 2 lead import/CRUD and minimal campaign create/list redesign
- CRM, billing, LinkedIn/WhatsApp automation, mobile app, browser extension, team collaboration

---

# Acceptance Criteria

- Company research can be generated for a lead, validated, stored in `company_research`, and retrieved via API; workflow is repeatable and failures are tracked in `ai_tasks`.
- Personalized emails can be generated from lead + research + template, validated, stored in `generated_emails`, and linked to the lead.
- Generated emails can be queued without duplicate active queue rows and sent via the email provider with `sent_emails` history.
- Queue processor and retry cron endpoints are cron-secret protected and do not double-send after interruption.
- Inbound replies are ingested via signed webhook, stored, associated to the correct sent email/lead, and idempotent on replay.
- Replies can be AI-classified into approved enums; results persist; lead status updates consistently; fallback to human-review on repeated AI failure.
- Campaign progress and dashboard analytics APIs return consistent metrics derived from persisted data.
- Settings and activity logging support operational diagnostics for auth, campaigns, leads, AI, email, and replies.
- Public APIs remain authenticated (or signature/cron protected where specified), tenant-scoped, thin-controller, service-driven, and envelope-compliant.
- Production deployment on Vercel succeeds with required secrets; validation/logging are robust enough for solo-maintainer operations.
- No Sprint 1/2 redesign and no out-of-bible product features are introduced.

---

# Definition of Done

This sprint is done when all of the following are true:

1. Every numbered development task (1–66) is completed and verifiable.
2. All Acceptance Criteria are satisfied.
3. Changes remain aligned with `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API_CONTRACTS.md`, and `docs/AI_GUIDELINES.md` with no architecture redesign.
4. Schema additions are limited to Phase 3–7 needs (`company_research`, `ai_tasks`, `email_templates`, `generated_emails`, `email_queue`, `sent_emails`, `email_replies`, `system_settings`, `activity_logs`) and do not invent undocumented tables.
5. Code follows `docs/CODING_STANDARDS.md` (thin routes, services own workflows, repositories own persistence, replaceable providers, strong typing).
6. The full outreach loop (research → generate → queue → send → reply → classify → analytics) works end-to-end in a production-deployed environment.
7. No scope from Sprint 1 or Sprint 2 is redesigned, and no explicitly excluded product features are included.
