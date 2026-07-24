# CODING_STANDARDS.md

# Backend Coding Standards

Version: 1.0

Status: Approved

Owner: Senior Backend Engineer

Architecture Owner: GPT CTO

---

# Purpose

This document defines the implementation standards for the backend codebase.

These standards are implementation rules only.

Architecture decisions are assumed to have already been approved and must not be changed by implementation. :contentReference[oaicite:0]{index=0}

---

# Core Engineering Principles

Every implementation must follow:

- Production Ready
- Clean Architecture
- SOLID Principles
- Repository Pattern
- Service Layer
- Strong Typing
- Modular Design
- No Duplicated Code
- Thin API Routes
- Business Logic inside Services
- Replaceable Providers
- No Hidden Dependencies
- Async/Await Only
- Type Safety Everywhere

---

# Folder Naming

Use lowercase.

Use kebab-case.

Example:

```
app/
lib/
repositories/
services/
schemas/
types/
utils/
middleware/
constants/
providers/
validators/
```

Never use:

```
Helpers
Misc
Temp
CommonStuff
```

---

# File Naming

Use kebab-case.

Examples

```
lead.repository.ts
lead.service.ts
lead.schema.ts
lead.types.ts
lead.mapper.ts
email.service.ts
supabase.client.ts
logger.ts
error-handler.ts
```

Avoid

```
LeadRepo.ts
LeadService.ts
myFile.ts
utils2.ts
new.ts
```

---

# Function Naming

Use camelCase.

Function names should start with verbs.

Examples

```
createLead()

updateLead()

deleteLead()

findLeadById()

generateEmail()

sendCampaign()

queueEmail()

classifyReply()
```

Boolean functions

```
isVerified()

hasPermission()

canSendEmail()
```

Avoid

```
Lead()

Data()

Email()

run()

temp()
```

---

# Variable Naming

Use camelCase.

Good

```
leadId

campaignStatus

emailQueue

generatedSubject

replyClassification
```

Constants

```
MAX_RETRIES

EMAIL_BATCH_SIZE

DEFAULT_TIMEOUT
```

Never abbreviate unless industry standard.

Avoid

```
l

tmp

obj

res1

val
```

---

# Class Naming

Use PascalCase.

Examples

```
LeadRepository

LeadService

EmailProvider

CampaignRepository

Logger
```

Interfaces

```
ILeadRepository
IEmailProvider
```

DTOs

```
CreateLeadDto

UpdateLeadDto
```

---

# Repository Pattern

Repositories are responsible only for data access.

Repositories MUST NOT:

- contain business logic
- call AI
- send emails
- perform validation
- contain HTTP logic

Allowed

```
insert()

update()

delete()

findById()

findMany()

exists()
```

Every repository returns typed objects.

No raw any.

---

# Service Layer

Business logic belongs only inside services. :contentReference[oaicite:1]{index=1}

Services may:

- validate input
- call repositories
- call AI providers
- call email providers
- orchestrate workflows
- enforce business rules

Services must NOT:

- directly manipulate HTTP request/response
- contain SQL
- know UI logic

---

# Error Handling

Never ignore errors.

Never use empty catch blocks.

Always throw typed errors.

Example categories

```
ValidationError

AuthenticationError

AuthorizationError

ConflictError

NotFoundError

DatabaseError

ExternalServiceError
```

API routes convert errors into HTTP responses.

Internal errors are logged.

Sensitive details are never exposed.

---

# Logging

Every important operation must be logged.

Log:

- Request start
- Request completion
- External API calls
- Database failures
- Authentication failures
- AI failures
- Email failures

Never log:

- passwords
- tokens
- secrets
- API keys
- authentication cookies
- personal sensitive information

Every log should include:

```
timestamp

requestId

module

operation

duration

status
```

---

# Validation

All external input must be validated.

Validation happens before business logic.

Never trust:

- request body
- query
- params
- headers
- webhook payloads

Validation failures return HTTP 400.

---

# TypeScript Rules

Strict Mode enabled.

Never use:

```
any
```

Prefer

```
unknown

generics

interfaces

type aliases
```

Always:

- explicit return types
- readonly where applicable
- async/await
- optional chaining
- nullish coalescing

Avoid

```
var
```

Prefer

```
const

let
```

---

# Zod Rules

Every API endpoint requires Zod validation. :contentReference[oaicite:2]{index=2}

Use:

- request schemas
- response schemas
- environment schemas

Rules

- Parse immediately
- Reuse schemas
- Infer types from schemas

```
type CreateLeadInput =
z.infer<typeof createLeadSchema>;
```

Never duplicate validation.

---

# Supabase Rules

Use Supabase PostgreSQL as the only database. :contentReference[oaicite:3]{index=3}

All access goes through repositories.

Never access Supabase directly from:

- services
- API routes
- middleware
- utilities

Always:

- parameterized queries
- typed responses
- handle null results
- check affected rows
- use transactions where required
- minimize round trips

Never expose service role keys to the client.

---

# Testing Standards

Every business-critical service requires tests.

Test:

- services
- repositories
- validators
- utilities

Include:

- happy path
- edge cases
- validation failures
- authorization failures
- external service failures

Mock:

- AI providers
- email providers
- Supabase
- external APIs

---

# API Standards

API routes remain thin. :contentReference[oaicite:4]{index=4}

Responsibilities:

- parse request
- validate
- authenticate
- call service
- return response

Never:

- write SQL
- contain business logic
- duplicate validation

Responses should be consistent.

Example

Success

```
{
  "success": true,
  "data": {}
}
```

Failure

```
{
  "success": false,
  "error": {
    "code": "...",
    "message": "..."
  }
}
```

Use proper HTTP status codes.

---

# Security Standards

Always:

- validate input
- sanitize output where applicable
- use authentication middleware
- authorize every protected action
- use environment variables
- use HTTPS
- rate limit public endpoints
- protect secrets

Never:

- trust client data
- expose stack traces
- expose internal IDs unnecessarily
- log credentials

---

# Performance Standards

Prefer:

- pagination
- indexed queries
- batching
- caching where approved
- lazy loading
- reusable database connections

Avoid:

- N+1 queries
- repeated database calls
- unnecessary allocations
- blocking operations

Measure:

- response time
- query count
- memory usage

---

# Code Review Checklist

Before merging:

- Architecture respected
- No duplicated code
- Naming conventions followed
- Strong typing used
- No any
- Validation implemented
- Logging included
- Errors handled
- Repository pattern respected
- Service layer respected
- API remains thin
- Security reviewed
- Performance reviewed
- Tests passing
- Lint passing
- Formatting correct

---

# Production Readiness Checklist

Every feature must satisfy:

- Production build succeeds
- TypeScript passes
- Lint passes
- Tests pass
- Zod validation complete
- Error handling complete
- Logging implemented
- Environment variables documented
- No TODOs
- No console.log
- No hardcoded secrets
- No dead code
- No duplicated logic
- API contract followed
- Repository pattern followed
- Service layer followed
- Performance reviewed
- Security reviewed
- Ready for deployment

---

# Non-Negotiable Rules

1. Never redesign approved architecture.
2. Business logic belongs in services.
3. Data access belongs in repositories.
4. API routes remain thin.
5. Validate all external input using Zod.
6. Use strict TypeScript.
7. Use async/await only.
8. No duplicated code.
9. No hidden dependencies.
10. If required information is missing, ask instead of assuming.
