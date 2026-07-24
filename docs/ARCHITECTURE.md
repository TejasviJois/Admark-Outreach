# ARCHITECTURE.md

> Version: 1.0
>
> Architecture: Next.js + Supabase + Vercel
>
> Based on: PROJECT_BIBLE :contentReference[oaicite:0]{index=0}

---

# 1. Architecture Goals

The architecture is designed around the engineering principles defined in the PROJECT_BIBLE.

## Primary Goals

- Serverless-first
- Low operational cost
- Production-ready
- Simple to maintain
- Modular
- Strongly typed
- Replaceable providers
- Thin API layer
- Service Layer architecture
- Repository Pattern
- Multi-tenant ready
- Scalable without major redesign

---

# 2. High-Level System Architecture

```
                        ┌────────────────────────┐
                        │       Browser UI       │
                        │     Next.js (App)      │
                        └───────────┬────────────┘
                                    │ HTTPS
                                    ▼
                    ┌────────────────────────────────┐
                    │     Next.js API Routes         │
                    │        (Thin Controllers)      │
                    └───────────┬────────────────────┘
                                │
                Request Validation (Zod)
                                │
                                ▼
                    ┌───────────────────────────────┐
                    │        Service Layer          │
                    │ Business Logic & Workflows    │
                    └───────────┬───────────────────┘
                                │
          ┌─────────────────────┼──────────────────────┐
          ▼                     ▼                      ▼
 Repository Layer      Provider Abstractions      Domain Utilities
          │                     │                      │
          ▼                     ▼                      ▼
   Supabase/PostgreSQL     Gemini / Email         Shared Libraries
          │
          ▼
   Supabase PostgreSQL
```

---

# 3. Core Components

## Frontend

Technology

- Next.js App Router
- TypeScript

Responsibilities

- Dashboard
- Lead Management
- Campaign Management
- Analytics
- Authentication
- API Consumption

No business logic should exist in the frontend.

---

## API Layer

Technology

- Next.js API Routes

Responsibilities

- Authentication
- Request validation
- Authorization
- DTO mapping
- Service invocation
- Response formatting

Business logic must never be implemented in API routes.

---

## Service Layer

Purpose

The Service Layer owns all business logic.

Responsibilities

- Lead import workflow
- Campaign workflow
- AI workflow
- Email workflow
- Reply workflow
- Analytics aggregation
- Validation beyond schema checks
- Transaction orchestration

Services communicate with repositories and provider abstractions only.

---

## Repository Layer

Purpose

Encapsulates all database operations.

Responsibilities

- CRUD operations
- Query composition
- Pagination
- Filtering
- Transactions
- Persistence

Repositories must not contain business logic.

---

## Provider Layer

Purpose

Abstracts external services.

Initial Providers

- Gemini Provider
- Email Provider
- Authentication Provider

Future Providers

- Multiple AI providers
- Multiple email providers
- Storage providers
- Analytics providers

Application services depend on interfaces rather than vendor implementations.

---

# 4. Component Diagram

```
                Frontend (Next.js)

                       │

                       ▼

              API Route (Controller)

                       │

                 Zod Validation

                       │

                       ▼

                 Service Layer

        ┌──────────┼───────────────┐

        ▼          ▼               ▼

Repositories  AI Provider   Email Provider

        │          │               │

        ▼          ▼               ▼

    PostgreSQL   Gemini        Email Service
```

---

# 5. Request Lifecycle

```
Client Request

↓

API Route

↓

Authentication

↓

Authorization

↓

Zod Validation

↓

Service

↓

Repository

↓

Database

↓

Service

↓

Response DTO

↓

Client
```

---

# 6. Data Flow

## Lead Import

```
CSV

↓

Upload Endpoint

↓

Validation

↓

Lead Service

↓

Lead Repository

↓

PostgreSQL
```

---

## Research Flow

```
Lead

↓

Research Service

↓

Gemini Provider

↓

Structured Output

↓

Research Repository

↓

Database
```

---

## Email Generation

```
Lead

↓

Research

↓

Email Service

↓

Prompt Builder

↓

Gemini Provider

↓

Generated Email

↓

Database
```

---

## Email Sending

```
Queued Email

↓

Email Queue Service

↓

Email Provider

↓

Delivery

↓

Sent Email Repository
```

---

## Reply Processing

```
Incoming Reply

↓

Email Provider

↓

Reply Service

↓

Gemini Provider

↓

Classification

↓

Database

↓

Analytics
```

---

# 7. Service Layer Design

Each domain owns a dedicated service.

## Lead Service

Responsibilities

- Import leads
- Validate duplicates
- Update lead status
- Archive leads

---

## Campaign Service

Responsibilities

- Create campaigns
- Activate campaigns
- Pause campaigns
- Archive campaigns
- Aggregate metrics

---

## Research Service

Responsibilities

- Trigger company research
- Store structured research
- Retry failures

---

## Email Service

Responsibilities

- Generate emails
- Queue emails
- Send emails
- Retry failures

---

## Reply Service

Responsibilities

- Receive replies
- Store replies
- Trigger AI classification
- Update lead state

---

## Analytics Service

Responsibilities

- Campaign metrics
- Reply metrics
- Delivery metrics
- Performance summaries

---

## Settings Service

Responsibilities

- Tenant configuration
- Feature flags
- Provider configuration

---

# 8. Repository Layer

Each aggregate root owns its repository.

Repositories

- TenantRepository
- UserRepository
- CampaignRepository
- LeadRepository
- ResearchRepository
- EmailTemplateRepository
- GeneratedEmailRepository
- EmailQueueRepository
- SentEmailRepository
- ReplyRepository
- AiTaskRepository
- ActivityLogRepository
- SettingsRepository

Repositories expose persistence operations only.

---

# 9. Provider Abstractions

## AI Provider

Responsibilities

- Generate research
- Generate emails
- Classify replies

Current Implementation

- Gemini

Future

- OpenAI
- Anthropic
- Azure AI

---

## Email Provider

Responsibilities

- Send email
- Receive replies
- Delivery status
- Bounce detection

Future implementations can replace the provider without modifying services.

---

## Authentication Provider

Responsibilities

- Login
- Session validation
- JWT verification

Current

- Supabase Auth

---

# 10. Authentication Flow

```
User

↓

Login Screen

↓

Supabase Auth

↓

JWT Issued

↓

API Request

↓

JWT Validation

↓

User Lookup

↓

Tenant Resolution

↓

Service Execution
```

Authorization is based on authenticated user context and tenant ownership.

---

# 11. Email Flow

```
Campaign

↓

Lead Selection

↓

Research Available?

↓

Generate Email

↓

Store Generated Email

↓

Queue Email

↓

Send Email

↓

Store Delivery Metadata

↓

Await Reply
```

Email generation and email delivery are intentionally separated.

---

# 12. Reply Processing Flow

```
Incoming Reply

↓

Store Reply

↓

AI Classification

↓

Update Lead Status

↓

Update Campaign Metrics

↓

Log Activity

↓

Dashboard Refresh
```

---

# 13. AI Workflow

```
Lead

↓

Research Prompt

↓

Gemini

↓

Structured Research

↓

Email Prompt

↓

Gemini

↓

Generated Email

↓

Reply Received

↓

Classification Prompt

↓

Gemini

↓

Reply Classification
```

Every AI interaction produces structured output that is validated before persistence.

---

# 14. Folder Structure

```
app/
│
├── (dashboard)
├── api/
├── auth/
└── layout.tsx

components/
│
├── common/
├── campaigns/
├── leads/
├── emails/
└── analytics/

features/
│
├── campaigns/
├── leads/
├── research/
├── emails/
├── replies/
└── settings/

services/
│
├── campaign/
├── lead/
├── research/
├── email/
├── reply/
├── analytics/
└── settings/

repositories/
│
├── campaign/
├── lead/
├── research/
├── email/
├── reply/
└── settings/

providers/
│
├── ai/
├── email/
└── auth/

schemas/
│
├── campaign/
├── lead/
├── email/
└── reply/

types/
utils/
lib/
constants/
config/
```

The structure is organized by domain while keeping shared infrastructure isolated.

---

# 15. Design Patterns

## Service Layer

Owns business logic.

---

## Repository Pattern

Owns persistence logic.

---

## Dependency Inversion

Services depend on abstractions rather than implementations.

---

## Provider Pattern

External services are replaceable.

---

## DTO Pattern

External contracts are separated from internal models.

---

## Factory Pattern (Future)

Provider instances can be selected through configuration.

---

## Strategy Pattern (Future)

Supports multiple AI models or email providers without changing workflows.

---

# 16. Scalability Considerations

## Database

- UUID primary keys
- Indexed foreign keys
- Tenant-aware schema
- Soft deletes
- Optimized read patterns

---

## API

- Stateless
- Horizontally scalable
- Serverless execution

---

## AI

- Provider abstraction
- Retry support
- Task tracking
- Model version recording

---

## Email

- Queue-based delivery
- Retry mechanism
- Delivery metadata
- Provider independence

---

## Analytics

- Derived from persisted data
- Database views for aggregation
- Avoid duplicate metrics storage

---

# 17. Error Handling Strategy

All layers return typed domain errors.

```
Controller
    ↓
Service
    ↓
Repository / Provider
```

Responsibilities:

- Controllers translate domain errors into HTTP responses.
- Services enforce business rules.
- Repositories surface persistence failures.
- Providers normalize external service errors.

This separation keeps error handling consistent and testable.

---

# 18. Observability

Application events are recorded through structured activity logging.

Recommended observability categories:

- Authentication events
- Campaign lifecycle
- Lead lifecycle
- AI operations
- Email delivery
- Reply processing
- System errors

Metrics should be derived from persisted data rather than transient memory.

---

# 19. Future SaaS Architecture

The architecture is designed to evolve without restructuring the core application.

## Phase 1

- Single tenant
- Single user
- Single deployment

---

## Phase 2

- Multiple users
- Tenant isolation
- Role-based access

---

## Phase 3

- Multiple organizations
- Provider configuration per tenant
- Usage metering
- Subscription management

---

## Phase 4

- Dedicated background workers
- Scheduled jobs
- Webhook processing
- Event-driven integrations
- Horizontal scaling

The core architectural boundaries (API → Service → Repository → Provider) remain unchanged across all phases, allowing the platform to grow from an internal tool into a multi-tenant SaaS without fundamental redesign.
