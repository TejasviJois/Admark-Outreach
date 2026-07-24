# ROADMAP.md

> Source of Truth: PROJECT_BIBLE.md :contentReference[oaicite:0]{index=0}

---

# Admark AI Outreach Platform Roadmap

## Project Objective

Build a production-ready AI-powered outbound outreach platform that automates the complete cold email workflow while remaining:

- Serverless
- Low-cost
- Easy for a solo developer to maintain
- Production ready
- Modular
- Scalable
- Multi-tenant ready (architecture only)

---

# Development Strategy

Development should follow an incremental approach where each sprint produces a usable improvement without introducing unnecessary complexity.

Priority Order:

1. Foundation
2. Lead Management
3. AI Personalization
4. Email Automation
5. Reply Processing
6. Campaign Analytics
7. Production Hardening

---

# Phase 1 — Project Foundation

## Goal

Create the technical foundation that every future feature depends on.

---

## Sprint 1.1 — Project Setup

### Goals

- Initialize project
- Configure TypeScript
- Configure validation
- Configure Supabase
- Configure authentication
- Configure environment management

### Deliverables

- Next.js project
- Supabase integration
- Supabase Auth
- Zod setup
- Environment configuration
- Shared utilities
- Base folder structure

### Dependencies

None

### Success Criteria

- Application runs locally
- Authentication works
- Database connection established
- Deployment succeeds on Vercel

---

## Sprint 1.2 — Core Architecture

### Goals

Implement engineering standards.

### Deliverables

- Repository pattern
- Service layer
- Thin API routes
- Shared error handling
- Logging
- Strong typing
- Modular architecture

### Dependencies

Sprint 1.1

### Success Criteria

- Business logic separated from APIs
- No duplicated code
- Replaceable providers
- Clean architecture

---

# Phase 2 — Lead Management

## Goal

Allow importing and managing outreach leads.

---

## Sprint 2.1 — Lead Import

### Goals

Enable importing leads into the platform.

### Deliverables

- Lead import workflow
- Lead storage
- Validation
- Duplicate prevention

### Dependencies

Phase 1

### Success Criteria

- Leads successfully imported
- Leads stored correctly
- Invalid data rejected

---

## Sprint 2.2 — Lead Management

### Goals

Provide a reliable lead repository.

### Deliverables

- Lead listing
- Lead retrieval
- Lead updates
- Lead status management

### Dependencies

Sprint 2.1

### Success Criteria

- Leads managed successfully
- Consistent database state

---

# Phase 3 — AI Research & Email Generation

## Goal

Automate research and personalized email generation.

---

## Sprint 3.1 — Company Research

### Goals

Research imported companies using AI.

### Deliverables

- Research workflow
- AI service integration
- Stored research results

### Dependencies

Phase 2

### Success Criteria

- Research generated
- Research stored
- Workflow repeatable

---

## Sprint 3.2 — Personalized Email Generation

### Goals

Generate personalized outreach emails.

### Deliverables

- Prompt workflow
- Email generation service
- Email storage

### Dependencies

Sprint 3.1

### Success Criteria

- Personalized email generated
- Email linked to lead
- Output validated

---

# Phase 4 — Email Queue & Sending

## Goal

Automate outbound email delivery.

---

## Sprint 4.1 — Email Queue

### Goals

Prepare emails for delivery.

### Deliverables

- Email queue
- Queue status tracking
- Queue processing

### Dependencies

Phase 3

### Success Criteria

- Emails successfully queued
- Queue processing reliable

---

## Sprint 4.2 — Email Sending

### Goals

Send queued emails.

### Deliverables

- Email sending workflow
- Send status tracking
- Delivery logging

### Dependencies

Sprint 4.1

### Success Criteria

- Emails successfully sent
- Failures handled gracefully
- Send history maintained

---

# Phase 5 — Reply Processing

## Goal

Automatically process inbound responses.

---

## Sprint 5.1 — Reply Reception

### Goals

Receive incoming email replies.

### Deliverables

- Reply ingestion
- Reply storage
- Lead association

### Dependencies

Phase 4

### Success Criteria

- Replies received
- Replies linked correctly

---

## Sprint 5.2 — AI Reply Classification

### Goals

Automatically classify replies.

### Deliverables

- AI classification workflow
- Classification storage
- Status updates

### Dependencies

Sprint 5.1

### Success Criteria

- Replies classified consistently
- Results stored

---

# Phase 6 — Campaign Tracking & Analytics

## Goal

Provide visibility into outreach performance.

---

## Sprint 6.1 — Campaign Tracking

### Goals

Track campaign progress.

### Deliverables

- Campaign tracking
- Campaign statistics
- Status reporting

### Dependencies

Phase 5

### Success Criteria

- Campaign progress visible
- Data consistent

---

## Sprint 6.2 — Analytics Dashboard

### Goals

Provide operational insights.

### Deliverables

- Analytics dashboard
- Performance metrics
- Reporting views

### Dependencies

Sprint 6.1

### Success Criteria

- Metrics displayed correctly
- Dashboard supports operational decisions

---

# Phase 7 — Production Readiness

## Goal

Prepare the application for reliable production usage.

---

## Sprint 7.1 — Stability

### Goals

Improve reliability.

### Deliverables

- Error handling improvements
- Logging improvements
- Validation review

### Dependencies

All previous phases

### Success Criteria

- Stable operation
- Clear diagnostics
- Robust validation

---

## Sprint 7.2 — Performance & Deployment

### Goals

Finalize production deployment.

### Deliverables

- Production deployment
- Performance review
- Final optimization

### Dependencies

Sprint 7.1

### Success Criteria

- Production deployment successful
- Performance acceptable
- Low operational overhead

---

# Estimated Development Order

1. Project setup
2. Authentication
3. Database integration
4. Core architecture
5. Lead import
6. Lead management
7. Company research
8. Personalized email generation
9. Email queue
10. Email sending
11. Reply reception
12. Reply classification
13. Campaign tracking
14. Analytics dashboard
15. Production hardening

---

# Major Dependencies

| Component | Depends On |
|-----------|------------|
| Authentication | Project setup |
| Repository layer | Project setup |
| Lead management | Database |
| AI research | Lead management |
| Email generation | AI research |
| Email queue | Email generation |
| Email sending | Email queue |
| Reply processing | Email sending |
| Reply classification | Reply reception |
| Analytics | Campaign tracking |

---

# Project Milestones

## Milestone 1

Foundation Complete

- Infrastructure ready
- Authentication operational
- Architecture established

---

## Milestone 2

Lead Management Complete

- Leads imported
- Leads managed
- Data validated

---

## Milestone 3

AI Outreach Ready

- Company research operational
- Personalized emails generated

---

## Milestone 4

Automated Email Delivery

- Queue operational
- Emails sent automatically

---

## Milestone 5

Reply Automation

- Replies received
- AI classification operational

---

## Milestone 6

Analytics Complete

- Campaign tracking available
- Dashboard operational

---

## Milestone 7

Production Release

- Stable deployment
- Production-ready platform
- Maintainable architecture

---

# Key Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI output inconsistency | Medium | Validate AI outputs using structured validation |
| Email reputation | High | Monitor sending workflow and maintain good sending practices |
| Provider lock-in | Medium | Maintain replaceable provider architecture |
| Growing complexity | Medium | Preserve modular architecture and repository pattern |
| Maintenance burden | High | Keep implementation simple, modular, and aligned with engineering principles |
| Cost growth | Medium | Prefer serverless deployment and free tiers where possible |

---

# Future Expansion Roadmap

The following items are explicitly aligned with the project's stated vision and should be considered after Version 1 reaches production. They are architectural evolution goals rather than new product features.

## Version 2

- Founder-focused improvements

---

## Version 3

- Small agency support

---

## Version 4

- Sales team support

---

## Long-Term Platform Evolution

- Transition from internal tool to SaaS platform
- Enable multi-tenant architecture implementation using the existing multi-tenant-ready foundation

---

# Definition of Done

A phase is considered complete when:

- All sprint deliverables are implemented.
- Success criteria are satisfied.
- The solution remains modular, strongly typed, and maintainable.
- The architecture continues to support serverless deployment, low operational cost, and future multi-tenant expansion without redesign.
