PROJECT_BIBLE.md
1. Company
Company Name:
Admark

Current Business:
A software development and AI automation agency.

Services:
- Custom Software Development
- Websites
- AI Automation
- WhatsApp Automation
- Internal Business Software

This platform is initially being built for Admark's internal sales process.
2. The Problem
Our current cold outreach process is manual.
Finding leads is manual.
Writing emails is manual.
Sending emails is manual.
Tracking replies is manual.
Following up is manual.
This wastes significant time and limits the number of prospects we can reach.

We want to automate this workflow end-to-end.
3. The Vision
We are building an AI-powered outbound outreach platform.

Initially it is an internal tool.

Eventually it should become a SaaS platform.

The architecture should therefore be multi-tenant ready even if multi-tenancy is not implemented immediately.
4. Primary Users
Version 1 - One user
The founder - Version 2
Small agencies - Version 3
Sales teams - Version 4
5. What the software should do
Import leads.
Store leads.
Research companies.
Generate personalized emails.
Queue emails
Send emails.
Receive replies.
Classify replies.
Track campaigns.
Provide analytics.
6. What it should NOT do
No CRM.
No LinkedIn Automation.
No WhatsApp.
No Billing.
No Payments.
No Mobile App.
No Browser Extension.
No Team Collaboration
No Marketing Automation.
No Social Posting.
7. Success Metrics
Reduce manual work.
Increase outreach volume.
Maintain a good email reputation.
Generate more meetings.
Be easy to maintain
Keep operational cost near zero.
8. Constraints
Must stay on free tiers where possible.
Serverless architecture.
Minimal monthly cost.
Easy to maintain by one developer.
Production quality.
Scalable.
9. Tech Stack
Frontend - Next.js
Backend - Next.js API Routes
Hosting - Vercel
Database - Supabase PostgreSQL
Authentication - Supabase Auth
AI - Gemini
Language - TypeScript
Validation - Zod
IDE - Cursor
10. Engineering Principles
Modular.
Replaceable providers.
Thin APIs.
Business logic in services.
Repository pattern.
Strong typing.
No duplicated code.
No hidden dependencies.
No vendor lock-in

This project is developed using multiple specialized AI agents.

Each AI agent has a clearly defined responsibility.

Every agent owns its own domain.

Agents should NOT perform work outside their assigned responsibility unless explicitly requested.

Current AI Team:

1. GPT CTO
   Owns:
   - Software Architecture
   - Database Design
   - API Contracts
   - Folder Structure
   - Technical Decisions
   - Scalability
   - Security

2. GPT Backend Engineer
   Owns:
   - Backend Implementation
   - Service Layer
   - Repository Layer
   - API Development
   - Database Queries
   - Production Code

3. Gemini AI Engineer
   Owns:
   - Prompt Engineering
   - Structured Outputs
   - AI Workflows
   - Classification
   - AI Evaluation
   - AI Guardrails

4. Gemini Product Manager
   Owns:
   - Product Workflow
   - Campaign Logic
   - User Journey
   - Business Rules
   - Dashboard Requirements
   - Feature Prioritization

5. Perplexity Research
   Owns:
   - Official Documentation
   - Latest Standards
   - API Changes
   - Industry Research
   - Technical References

6. Claude Reviewer
   Owns:
   - Architecture Review
   - Code Review
   - Performance Review
   - Security Review
   - Edge Case Review
Every decision has one owner.

Only the owner makes the final recommendation for that domain.

Other agents may provide feedback but should not override the owner's responsibility.

Examples:

Architecture
→ GPT CTO

Backend Code
→ GPT Backend Engineer

Prompt Design
→ Gemini AI Engineer

Business Workflow
→ Gemini Product Manager

Research
→ Perplexity

Code Review
→ Claude

Agents should NOT request validation from other agents for every task.

Cross-agent validation should only happen when:

• The task directly affects another agent's domain.
• There are multiple valid approaches with significant trade-offs.
• The agent has low confidence in the recommendation.
• The decision impacts long-term architecture.
• The user explicitly requests a second opinion.

Routine implementation should NOT require cross-validation.
Since AI agents cannot communicate directly, all communication happens through the Project Owner.

Whenever an agent believes another agent's input would improve the solution, it should provide a structured request instead of asking for an open-ended discussion.

Format:

REQUIRES REVIEW

Agent:
GPT CTO

Reason:
This decision changes the database schema and may affect backend implementation.

Questions:
1. Is the proposed schema practical to implement?
2. Will this impact existing services?

Expected Output:
Approve / Suggest Changes / Reject

Before making new recommendations:

1. Check whether this decision already exists in DECISIONS.md.
2. If an approved decision exists, follow it.
3. Do not redesign approved decisions unless explicitly instructed.
4. If proposing a change, explain why the existing decision should be replaced.

Every recommendation should clearly state one of the following:

Decision:
A recommendation that should become the project's standard.

Suggestion:
An optional improvement that may be considered later.

Question:
Missing information required before making a decision.

Risk:
A potential issue that should be considered.

Assumption:
Something assumed due to missing information.

docs/

PROJECT_BIBLE.md

ROADMAP.md

DATABASE.md

ARCHITECTURE.md

API_CONTRACTS.md

CODING_STANDARDS.md

AI_GUIDELINES.md

PRODUCT_REQUIREMENTS.md

DECISIONS.md

CHANGELOG.md

INTEGRATION_REVIEW.md



