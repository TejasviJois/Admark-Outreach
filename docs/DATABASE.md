# DATABASE.md

> Version: 1.0
>
> Architecture: PostgreSQL (Supabase)
>
> Status: Initial Database Design
>
> Based on: PROJECT_BIBLE :contentReference[oaicite:0]{index=0}

---

# Database Design Goals

The database is designed to satisfy the project goals defined in the PROJECT_BIBLE:

- Simple to understand
- Serverless friendly
- PostgreSQL optimized
- Supabase optimized
- Multi-tenant ready
- Production ready
- Easy to extend into a SaaS
- Minimal maintenance
- Repository Pattern friendly

The architecture intentionally avoids premature complexity while ensuring future expansion without schema redesign.

---

# Design Principles

## UUID Everywhere

Every primary key uses UUID.

Reason

- Globally unique
- SaaS ready
- Safe for distributed systems
- Better for future data imports

---

## Soft Deletes

Business tables should support:

- deleted_at
- deleted_by (future)

Reason

Allows recovery and auditability.

---

## Audit Fields

Every business table contains:

- created_at
- updated_at

Future:

- created_by
- updated_by

---

## Tenant Ready

Although Version 1 is single-user, every business table includes:

tenant_id

Reason

Avoids a complete migration when converting into SaaS.

---

# ENUMS

---

## Lead Status

Purpose

Overall lifecycle of a lead.

Values

- NEW
- RESEARCHING
- READY
- QUEUED
- EMAILED
- REPLIED
- BOUNCED
- UNSUBSCRIBED
- FAILED
- ARCHIVED

---

## Campaign Status

Values

- DRAFT
- ACTIVE
- PAUSED
- COMPLETED
- ARCHIVED

---

## Email Status

Values

- PENDING
- QUEUED
- SENT
- FAILED
- BOUNCED

---

## Reply Classification

Values

- POSITIVE
- NEGATIVE
- OUT_OF_OFFICE
- NOT_INTERESTED
- SPAM
- UNKNOWN

---

## Research Status

Values

- PENDING
- RUNNING
- COMPLETED
- FAILED

---

## AI Task Status

Values

- PENDING
- PROCESSING
- COMPLETED
- FAILED

---

# TABLES

---

# tenants

## Purpose

Represents a company/workspace.

Initially there is only one record (Admark).

Future SaaS will have one tenant per customer.

---

## Columns

- id (PK)
- name
- slug
- plan
- is_active
- created_at
- updated_at

---

## Relationships

One Tenant

↓

Many Users

↓

Many Campaigns

↓

Many Leads

↓

Many Emails

---

## Why It Exists

Prepares the platform for SaaS without future schema redesign.

---

# users

Purpose

Application users authenticated through Supabase Auth.

---

## Columns

- id (PK)
- tenant_id (FK)
- auth_user_id
- full_name
- email
- role
- created_at
- updated_at

---

## Relationships

Many Users

↓

One Tenant

---

## Why It Exists

Separates application profile data from Supabase authentication.

---

# campaigns

Purpose

Represents an outreach campaign.

Example

"US Marketing Agencies"

---

## Columns

- id (PK)
- tenant_id (FK)
- name
- description
- status
- target_country
- target_industry
- created_at
- updated_at

---

## Relationships

One Campaign

↓

Many Leads

---

## Why It Exists

Campaigns organize outreach and analytics.

---

# leads

Purpose

Stores imported prospects.

Core business table.

---

## Columns

- id (PK)
- tenant_id (FK)
- campaign_id (FK)
- company_name
- website
- first_name
- last_name
- email
- linkedin_url
- industry
- country
- employee_count
- lead_status
- research_status
- created_at
- updated_at
- deleted_at

---

## Relationships

Many Leads

↓

One Campaign

One Lead

↓

One Research

↓

Many Emails

↓

Many AI Tasks

---

## Why It Exists

Central entity for the outreach platform.

---

# companies

Purpose

Canonical company identity (website unique per tenant).

## Columns

- id (PK)
- tenant_id (FK)
- website (normalized, unique with tenant)
- company_name
- created_at
- updated_at

---

# company_profiles

Purpose

Structured extraction from website crawl (or CSV-only when no website). Not LLM research.

## Columns

- id (PK)
- tenant_id (FK)
- company_id (FK, 1:1)
- lead_id (FK, optional link for campaign membership)
- company_name, industry, website, about
- services (jsonb), team_size, location
- technologies (jsonb), contact_email, linkedin_url, social_links (jsonb)
- source_pages (jsonb)
- profile_quality_score (0–100)
- status (PENDING | RUNNING | COMPLETED | INCOMPLETE | FAILED)
- extracted_at, created_at, updated_at

---

# crawl_jobs

Purpose

Crawl history for enrichment.

## Columns

- id (PK)
- tenant_id (FK)
- company_id (FK nullable)
- lead_id (FK nullable)
- website
- status (PENDING | RUNNING | COMPLETED | FAILED | SKIPPED)
- source_pages (jsonb)
- error_message
- started_at, finished_at, created_at

---

# campaigns (extensions)

- default_template_id (FK → email_templates)

---

# leads (extensions)

- company_id (FK → companies)

Campaign membership remains on `leads` (documented as campaign_leads conceptually).

---

# company_research

Purpose

Legacy LLM research table (superseded by company_profiles for Hybrid Campaign Mail). Keep for historical migrations; do not use for new enrichment.

---

## Columns

- id (PK)
- tenant_id (FK)
- lead_id (FK)
- summary
- products
- pain_points
- opportunities
- confidence_score
- status
- generated_at

---

## Relationships

One Lead

↓

One Research

---

## Why It Exists

Separates AI-generated data from manually imported lead data.

Improves maintainability.

---

# email_templates

Purpose

Stores reusable prompt-based email templates.

---

## Columns

- id
- tenant_id
- name
- subject_template
- body_template
- is_default
- created_at

---

## Relationships

Referenced by generated emails.

---

## Why It Exists

Allows changing messaging without modifying campaigns.

---

# generated_emails

Purpose

Stores AI-generated outreach emails.

---

## Columns

- id
- tenant_id
- lead_id
- template_id
- subject
- body
- generation_model
- generation_version
- created_at

---

## Relationships

One Lead

↓

Many Generated Emails

---

## Why It Exists

Preserves AI history and enables regeneration.

---

# email_queue

Purpose

Represents emails waiting to be sent.

---

## Columns

- id
- tenant_id
- generated_email_id
- scheduled_at
- status
- retry_count
- last_error
- created_at

---

## Relationships

One Generated Email

↓

One Queue Record

---

## Why It Exists

Decouples email generation from sending.

Critical for scalability.

---

# sent_emails

Purpose

Stores sent email metadata.

---

## Columns

- id
- tenant_id
- lead_id
- generated_email_id
- provider_message_id
- sent_at
- status
- opened_at (future)
- clicked_at (future)

---

## Relationships

One Lead

↓

Many Sent Emails

---

## Why It Exists

Tracks delivery independently of generated content.

---

# email_replies

Purpose

Stores inbound replies.

---

## Columns

- id
- tenant_id
- sent_email_id
- subject
- body
- received_at
- classification
- confidence_score

---

## Relationships

One Sent Email

↓

Many Replies

---

## Why It Exists

Supports automated reply classification.

---

# ai_tasks

Purpose

Tracks every AI operation.

Examples

- Research
- Email Generation
- Reply Classification

---

## Columns

- id
- tenant_id
- task_type
- entity_type
- entity_id
- model
- status
- started_at
- completed_at
- error_message

---

## Relationships

References multiple business entities through entity_type/entity_id.

---

## Why It Exists

Provides observability for AI workflows.

---

# activity_logs

Purpose

Application audit log.

---

## Columns

- id
- tenant_id
- user_id
- entity_type
- entity_id
- action
- metadata (JSONB)
- created_at

---

## Relationships

Linked to users and business entities.

---

## Why It Exists

Supports debugging, auditing, and future compliance.

---

# system_settings

Purpose

Stores tenant configuration.

---

## Columns

- id
- tenant_id
- key
- value (JSONB)
- updated_at

---

## Relationships

One Tenant

↓

Many Settings

---

## Why It Exists

Avoids hardcoded application configuration.

---

# RELATIONSHIP DIAGRAM

```
Tenant
│
├── Users
├── Campaigns
│      │
│      └── Leads
│              │
│              ├── Company Research
│              ├── Generated Emails
│              │         │
│              │         └── Email Queue
│              │
│              ├── Sent Emails
│              │        │
│              │        └── Email Replies
│              │
│              └── AI Tasks
│
├── Email Templates
├── Activity Logs
└── System Settings
```

---

# INDEXES

## Leads

- tenant_id
- campaign_id
- email
- company_name
- lead_status
- research_status

Reason

Most queried table.

---

## Campaigns

- tenant_id
- status

---

## Generated Emails

- lead_id

---

## Email Queue

- status
- scheduled_at

Supports worker polling.

---

## Sent Emails

- lead_id
- sent_at

---

## Replies

- classification
- received_at

---

## AI Tasks

- status
- task_type

---

# CONSTRAINTS

## Leads

Email should be unique within a tenant.

Unique

tenant_id + email

---

Website optional.

---

Campaign required.

---

Tenant required.

---

## Email Queue

Generated email must exist.

---

Retry count cannot be negative.

---

## Company Research

One active research per lead.

---

# POSTGRESQL FUNCTIONS

Suggested functions

---

## update_updated_at()

Automatically updates updated_at.

---

## normalize_email()

Converts email to lowercase before insert/update.

---

## queue_next_email()

Returns the next pending email ordered by scheduled_at.

---

## archive_campaign()

Archives completed campaigns and related records.

---

## calculate_campaign_stats()

Returns

- Total Leads
- Emails Sent
- Replies
- Positive Replies
- Bounce Rate

---

## cleanup_soft_deleted()

Removes permanently deleted records after retention period.

---

# VIEWS

---

## campaign_statistics

Aggregated campaign metrics.

---

## lead_overview

Lead + Campaign + Research status.

---

## pending_email_queue

Pending emails ordered for processing.

---

## reply_dashboard

Aggregated reply classifications.

---

## ai_task_dashboard

AI usage and success metrics.

---

# ROW LEVEL SECURITY (RLS)

Version 1

Single tenant.

RLS enabled but simple.

Policy

Users can only access rows where:

tenant_id = current user's tenant

---

Future SaaS

Every business table filtered by:

tenant_id

No tenant may access another tenant's data.

Admin-only tables use role-based policies.

---

# MULTI-TENANT READINESS

The schema is SaaS-ready from day one.

Every business table includes:

- tenant_id
- UUID primary keys
- tenant-scoped unique constraints
- tenant-scoped indexes
- RLS compatibility

No schema redesign is required when enabling multi-tenancy.

---

# FUTURE EXPANSION

The following modules can be added without altering existing core relationships:

- Email Accounts
- SMTP Providers
- Domain Reputation
- AI Prompt Versions
- AI Cost Tracking
- Attachment Management
- Webhook Events
- Scheduled Follow-ups
- Sequence Automation
- Team Members
- API Keys
- Usage Metering
- Subscription Plans
- Billing
- Integrations
- Notification Center
- Feature Flags
- Custom Fields
- Lead Tags
- Import History
- Export Jobs

These additions extend the platform while preserving the integrity of the core schema.
