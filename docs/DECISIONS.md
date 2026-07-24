## 2026-07-24

Decision:
Use Supabase as primary database.

Reason:
Managed PostgreSQL with authentication and RLS.

Approved By:
Project Owner

---

## 2026-07-24

Decision:
Use deterministic company enrichment (website crawl + extraction) before any LLM personalization. Use OpenRouter as the LLM gateway for email generation only. Do not use LLMs to discover company facts.

Reason:
Lower cost, less hallucination, model-independent personalization from structured profiles. V1 crawl uses Cheerio + fetch; tech-stack and business enrichment providers are stubbed for later.

Approved By:
Project Owner

Status:
Superseded by Hybrid Campaign Mail decision below.

---

## 2026-07-24

Decision:
Hybrid Campaign Mail pipeline: CSV upload → validate/normalize → crawl website with Cheerio only when a website exists → build structured company profile → load campaign default template → fill placeholders with a deterministic template engine → queue → send via Titan SMTP. AI enhancement is deferred (UI toggle stub only). AI is never used for website research or fact discovery. No OpenRouter dependency. Each campaign has one default email template.

Reason:
Reliable outreach without AI quota/cost blockers; campaign-scoped messaging (e.g. cafe campaign uses cafe template); Titan matches Admark’s existing mailbox (info@admarkdigitals.com).

Approved By:
Project Owner
