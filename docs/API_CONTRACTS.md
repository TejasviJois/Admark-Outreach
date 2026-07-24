# API_CONTRACTS.md

> Version: 1.0  
> Architecture: Next.js API Routes (App Router)  
> Authentication: Supabase Auth (JWT)  
> Validation: Zod  
> Based on: PROJECT_BIBLE :contentReference[oaicite:0]{index=0}

---

# API Design Principles

## Goals

- RESTful
- Stateless
- Versionable
- Thin Controllers
- Service Layer Driven
- Repository Pattern Compatible
- Multi-tenant Ready
- Strongly Typed
- Predictable Responses

---

# Base URL

```
/api/v1
```

Future versions:

```
/api/v2
/api/v3
```

---

# Authentication

All endpoints except authentication require:

```
Authorization: Bearer <JWT>
```

Authentication Provider:

- Supabase Auth

Unauthorized requests return:

```
401 Unauthorized
```

---

# Standard Response Format

## Success

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

---

## Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message"
  }
}
```

---

# Authentication APIs

---

## Get Current User

### Purpose

Returns the authenticated user's profile.

### Method

GET

### URL

```
/api/v1/auth/me
```

### Authentication

Required

### Request Body

None

### Response Body

- User profile
- Tenant information
- Role

### Status Codes

- 200
- 401

### Validation Rules

Valid JWT required.

### Possible Errors

- Unauthorized
- User not found

### Idempotency

Yes

---

# Campaign APIs

---

## List Campaigns

### Purpose

Returns campaigns.

### Method

GET

### URL

```
/api/v1/campaigns
```

### Authentication

Required

### Request

Pagination

Filtering

Sorting

### Response

Campaign collection.

### Status Codes

200

401

### Validation

Page >= 1

Limit <= configured maximum

### Idempotency

Yes

---

## Create Campaign

### Purpose

Creates a campaign.

### Method

POST

### URL

```
/api/v1/campaigns
```

### Authentication

Required

### Request Body

- name
- description
- targetCountry
- targetIndustry

### Response

Created campaign.

### Status Codes

- 201
- 400
- 401

### Validation

- Name required
- Name length limits
- Valid enum values

### Possible Errors

- Duplicate campaign
- Invalid payload

### Idempotency

No

---

## Get Campaign

### Method

GET

### URL

```
/api/v1/campaigns/{campaignId}
```

### Purpose

Returns campaign details.

### Authentication

Required

### Idempotency

Yes

---

## Update Campaign

### Method

PATCH

### URL

```
/api/v1/campaigns/{campaignId}
```

### Purpose

Updates campaign metadata.

### Authentication

Required

### Status Codes

200

400

404

### Idempotency

Yes

---

## Archive Campaign

### Method

DELETE

### URL

```
/api/v1/campaigns/{campaignId}
```

### Purpose

Soft archive campaign.

### Authentication

Required

### Status Codes

204

404

### Idempotency

Yes

---

# Lead APIs

---

## List Leads

### Method

GET

### URL

```
/api/v1/leads
```

### Purpose

Returns imported leads.

### Authentication

Required

### Query Parameters

- campaignId
- status
- page
- limit
- search

### Response

Lead list.

### Validation

Pagination.

### Idempotency

Yes

---

## Import Leads

### Method

POST

### URL

```
/api/v1/leads/import
```

### Purpose

Imports leads.

### Authentication

Required

### Request Body

CSV upload metadata.

### Response

Import summary.

### Status Codes

201

400

409

### Validation

- File required
- Supported format
- Duplicate detection

### Possible Errors

- Invalid CSV
- Missing columns
- Duplicate import

### Idempotency

No

---

## Get Lead

### Method

GET

### URL

```
/api/v1/leads/{leadId}
```

### Purpose

Returns lead details.

### Authentication

Required

### Idempotency

Yes

---

## Update Lead

### Method

PATCH

### URL

```
/api/v1/leads/{leadId}
```

### Purpose

Updates lead fields.

### Authentication

Required

### Validation

Email format

URL format

Status enum

### Idempotency

Yes

---

## Archive Lead

### Method

DELETE

### URL

```
/api/v1/leads/{leadId}
```

### Purpose

Soft delete.

### Idempotency

Yes

---

# Research APIs

---

## Generate Research

### Method

POST

### URL

```
/api/v1/research/{leadId}
```

### Purpose

Generates AI company research.

### Authentication

Required

### Request Body

Optional regeneration flag.

### Response

Research object.

### Status Codes

201

400

500

### Validation

Lead must exist.

### Possible Errors

AI unavailable

Generation failed

### Idempotency

Conditional

Repeated requests should return the latest completed research unless regeneration is explicitly requested.

---

## Get Research

### Method

GET

### URL

```
/api/v1/research/{leadId}
```

### Purpose

Returns stored research.

### Authentication

Required

### Idempotency

Yes

---

# Email Template APIs

---

## List Templates

GET

```
/api/v1/email-templates
```

Purpose

Returns available templates.

Authentication

Required

Idempotency

Yes

---

## Create Template

POST

```
/api/v1/email-templates
```

Purpose

Creates template.

Validation

Subject required

Body required

Unique template name per tenant

Idempotency

No

---

## Update Template

PATCH

```
/api/v1/email-templates/{templateId}
```

Idempotency

Yes

---

## Delete Template

DELETE

```
/api/v1/email-templates/{templateId}
```

Soft delete.

Idempotency

Yes

---

# Email Generation APIs

---

## Generate Email

### Method

POST

### URL

```
/api/v1/emails/generate
```

### Purpose

Creates personalized AI email.

### Authentication

Required

### Request Body

- leadId
- templateId

### Response

Generated email.

### Validation

Lead exists

Research available

Template exists

### Possible Errors

Research missing

AI failure

### Idempotency

Conditional

Returns existing generated content unless regeneration is requested.

---

## Queue Email

### Method

POST

### URL

```
/api/v1/emails/queue
```

### Purpose

Queues generated email.

### Request

generatedEmailId

scheduledAt

### Response

Queue entry.

### Validation

Email must exist.

Future schedule validation.

### Idempotency

Yes

Queueing the same generated email twice should not create duplicate active queue records.

---

## Send Email

### Method

POST

### URL

```
/api/v1/emails/send
```

### Purpose

Triggers immediate send.

### Authentication

Required

### Validation

Queued email exists.

### Possible Errors

Provider unavailable

Delivery failure

### Idempotency

Yes

Already-sent emails must not be transmitted again by the same request.

---

# Reply APIs

---

## List Replies

GET

```
/api/v1/replies
```

Purpose

Returns received replies.

Authentication

Required

Idempotency

Yes

---

## Get Reply

GET

```
/api/v1/replies/{replyId}
```

Purpose

Reply details.

Idempotency

Yes

---

## Classify Reply

POST

```
/api/v1/replies/{replyId}/classify
```

Purpose

Runs AI classification.

Response

Classification.

Validation

Reply exists.

Idempotency

Conditional

Returns existing classification unless reclassification is explicitly requested.

---

# Analytics APIs

---

## Campaign Analytics

GET

```
/api/v1/analytics/campaigns
```

Purpose

Campaign metrics.

Response

- Total Leads
- Emails
- Replies
- Positive Rate
- Bounce Rate

Authentication

Required

Idempotency

Yes

---

## Dashboard Analytics

GET

```
/api/v1/analytics/dashboard
```

Purpose

Dashboard summary.

Authentication

Required

Idempotency

Yes

---

# Settings APIs

---

## Get Settings

GET

```
/api/v1/settings
```

Purpose

Tenant configuration.

Authentication

Required

Idempotency

Yes

---

## Update Settings

PATCH

```
/api/v1/settings
```

Purpose

Updates configuration.

Authentication

Required

Validation

Schema validation using Zod.

Idempotency

Yes

---

# Webhook Endpoints

Webhook endpoints are intended for trusted provider-to-provider communication and require request signature verification.

---

## Incoming Email Webhook

### Method

POST

### URL

```
/api/v1/webhooks/email/inbound
```

### Purpose

Receives inbound email events.

### Authentication

Provider signature verification.

### Request

Provider payload.

### Response

Acknowledgement.

### Validation

- Signature validation
- Required provider fields
- Duplicate event detection

### Idempotency

Yes

Repeated delivery of the same provider event must not create duplicate replies.

---

## Delivery Status Webhook

### Method

POST

### URL

```
/api/v1/webhooks/email/status
```

### Purpose

Updates delivery status.

### Authentication

Provider signature verification.

### Validation

Provider event identifiers.

### Idempotency

Yes

---

# Cron APIs

These endpoints are intended for scheduled execution and must only be callable by trusted schedulers.

---

## Process Email Queue

### Method

POST

### URL

```
/api/v1/cron/process-email-queue
```

### Purpose

Processes pending email queue.

### Authentication

Cron secret.

### Validation

Cron authorization.

### Idempotency

Yes

The processor should safely resume after interruption without duplicate sends.

---

## Retry Failed Emails

POST

```
/api/v1/cron/retry-emails
```

Purpose

Retries failed deliveries.

Authentication

Cron secret.

Idempotency

Yes

---

## Cleanup Soft Deletes

POST

```
/api/v1/cron/cleanup
```

Purpose

Maintenance tasks.

Authentication

Cron secret.

Idempotency

Yes

---

# Internal APIs

Internal endpoints are not exposed to the frontend and are intended for server-to-server orchestration within the application.

---

## Trigger Research

POST

```
/api/v1/internal/research
```

Purpose

Starts AI research workflow.

Authentication

Internal service token.

---

## Trigger Email Generation

POST

```
/api/v1/internal/email-generation
```

Purpose

Generates pending emails.

Authentication

Internal service token.

---

## Trigger Reply Classification

POST

```
/api/v1/internal/reply-classification
```

Purpose

Processes new replies.

Authentication

Internal service token.

---

# Common Validation Rules

- JWT required for authenticated endpoints.
- All request bodies validated with Zod.
- UUID format required for resource identifiers.
- Enum values must match defined domain enums.
- Email addresses normalized before processing.
- URLs must be valid where applicable.
- Pagination values constrained to configured limits.
- Unknown request properties rejected.

---

# Common HTTP Status Codes

| Code | Meaning |
|-------|---------|
| 200 | Success |
| 201 | Resource Created |
| 204 | No Content |
| 400 | Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Resource Not Found |
| 409 | Conflict |
| 422 | Business Rule Violation |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | External Provider Failure |
| 503 | Service Unavailable |

---

# Common Error Codes

- VALIDATION_ERROR
- UNAUTHORIZED
- FORBIDDEN
- RESOURCE_NOT_FOUND
- DUPLICATE_RESOURCE
- INVALID_STATE
- AI_PROVIDER_ERROR
- EMAIL_PROVIDER_ERROR
- RATE_LIMITED
- EXTERNAL_SERVICE_FAILURE
- CONFLICT
- INTERNAL_ERROR

---

# API Versioning Strategy

- URI-based versioning (`/api/v1`)
- Additive changes are preferred.
- Breaking changes require a new version.
- Older versions may be deprecated with a migration period.
- Response formats remain backward compatible within the same major version.
