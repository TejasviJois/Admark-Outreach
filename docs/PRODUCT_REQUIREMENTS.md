# PRODUCT_REQUIREMENTS.md

## 1. Document Overview & Scope

### 1.1 Purpose

This document defines the product requirements for **Admark**, an autonomous, lightweight client outreach and response engine designed to automate cold email outreach and reply handling with minimal manual intervention.

### 1.2 Core Philosophy

* **Zero Bloat:** Dedicated strictly to lead outreach, email delivery, reply classification, and notification/drafting. No ad creation, complex marketing suites, or unnecessary tools.
* **Maximum Automation:** Eliminate repetitive tasks in prospecting, sequence execution, reply handling, and lead status updates.
* **Reputation & Deliverability First:** Built-in safeguards to protect domain health, prevent spam triggers, and respect target opt-outs.

---

## 2. User Journey

```
 [ Setup Outreach Rules ]
            │
            ▼
 [ Lead Discovery & Sourcing ]
            │
            ▼
 [ Automated Cold Sequence Execution ]
            │
            ▼
 [ Lead Replies to Email ]
            │
      ┌─────┴────────────────────────────────────────┐
      ▼                                              ▼
[ AI Auto-Reply (If pre-approved) ]      [ Instant Notification to User ]
                                                     │
                                                     ▼
                                       [ One-Click User Approval / Override ]

```

### 2.1 Key User Touchpoints

1. **Targeting & Prompt Setup:** User defines target ideal customer profile (ICP) criteria, service offer details, and outreach limits.
2. **Autonomous Lead Sourcing & Ingestion:** Admark identifies prospects matching the target criteria, verifies emails, and ingests them into active outreach queues.
3. **Automated Sending & Sequence Management:** Admark executes multi-step email sequences based on user-defined schedules and delay logic.
4. **Notification & Reply Intervention:** When a prospect replies, Admark categorizes the intent. If action is required, the user receives an alert with an AI-suggested draft or notification for manual review.

---

## 3. Campaign Workflow

### 3.1 Campaign Creation & Management

* **Target Profile Specification:** Define target industry, role, location, and company parameters.
* **Sequence Builder:** Step-by-step setup for Initial Email, Follow-up 1, Follow-up 2, and Final Nudge.
* **Sending Schedules:** Flexible window settings (e.g., Monday–Friday, 9:00 AM – 5:00 PM recipient local time).
* **Daily Rate Caps:** Settable per-domain or per-inbox daily limits to ensure domain safety.

### 3.2 Dynamic Personalization Engine

* Cold emails dynamically insert verified company details, recent news, or role-specific pain points using pre-configured AI generation parameters.
* Variable fallback logic ensures zero broken template tags (e.g., fallback to "your team" if company name is missing).

---

## 4. Lead Lifecycle

### 4.1 Lead States

Leads move through a strict state machine to prevent duplicate messaging and ensure accurate tracking:

| Lead Status | Trigger Condition | System Action |
| --- | --- | --- |
| **New / Discovered** | Lead ingested into system | Verification check initiated |
| **Verified** | Email deliverability confirmed | Queued for campaign assignment |
| **Invalid / Bounced** | Verification failed or email hard bounced | Suppressed permanently; excluded from campaigns |
| **Active Outreach** | Sequence Step 1 dispatched | Follow-up timers started |
| **Engaged** | Opened or clicked email multiple times | Priority score increased |
| **Replied** | Inbound response detected | Immediate sequence pause across all channels |
| **Converted / Meeting Booked** | Positive outcome achieved | Lead archived/handed off |
| **Unsubscribed / Opted-Out** | Negative reply or unsubscribe trigger | Domain and email added to master suppression list |
| **Exhausted** | All sequence steps sent without reply | Sequence completed; marked inactive |

---

## 5. Email Lifecycle

### 5.1 Outbound Flow

1. **Queueing:** Message rendered with lead variables and scheduled for sending window.
2. **In-Flight Checks:** Double check suppression list and sending account warm-up/limit caps.
3. **Dispatch:** Distributed across configured inbox accounts via inbox rotation.
4. **Tracking:**
* Open tracking (via light tracking pixel, toggleable for high-deliverability modes).
* Link click tracking (redirect proxy, optional per campaign).


5. **Delivery Feedback:** Real-time logging of `Delivered`, `Soft Bounce`, or `Hard Bounce`.

---

## 6. Reply Lifecycle & AI Processing

### 6.1 Reply Ingestion & Intent Classification

Upon receiving an inbound reply, the active outreach sequence is **immediately paused** for that lead. Admark parses the response body using natural language processing and assigns one of four classifications:

```
                          [ Inbound Reply Received ]
                                     │
                        [ Sequence Instantly Paused ]
                                     │
                        [ AI Intent Classification ]
                                     │
     ┌──────────────────┬────────────┴───────────────┬──────────────────┐
     ▼                  ▼                            ▼                  ▼
[ Interested ]   [ Question/Objection ]      [ Not Interested ]     [ Out of Office ]
     │                  │                            │                  │
     ├─ Auto Draft      ├─ Draft Suggested Response  ├─ Add to          ├─ Detect Return Date
     ├─ Notify User     └─ Alert User                │  Suppression     └─ Reschedule Follow-up
     └─ (Optional)                                   └─ Stop Sequence      for Return Date + 1
        Auto-Send

```

1. **Interested (High Intent):** Lead expresses interest or requests a call/demo.
* *Action:* Generates AI context-aware reply draft. Sends real-time notification to user. If auto-pilot mode is active for positive replies, dispatches response automatically.


2. **Question / Objection:** Lead asks for pricing, details, or raises concerns.
* *Action:* Drafts tailored answer based on service knowledge base and alerts user for review.


3. **Not Interested / Unsubscribe:** Lead asks to stop contacting or rejects offer.
* *Action:* Sequence stopped permanently. Email and company domain logged in global suppression list.


4. **Out of Office (OOO) / Auto-Responder:**
* *Action:* Extract return date (if present). Pause sequence and set reactivation trigger for `Return Date + 1 business day`.



---

## 7. Dashboard Requirements

### 7.1 Core Performance Metrics (Top-Level)

* **Active Campaigns:** Total live campaigns vs. paused.
* **Leads Contacted:** Aggregate leads reached in the current billing/time cycle.
* **Deliverability Health Rate:** Percentage of delivered emails vs. bounces.
* **Positive Reply Rate:** Percentage of total replies classified as "Interested".
* **Meetings / Conversions:** Total positive outcomes logged.

### 7.2 Unified Outreach & Reply Feed

* **Master Outreach Feed:** Real-time log of sent emails, opens, clicks, and bounces.
* **Actionable Reply Inbox:** Focused view showing only replies requiring user attention, equipped with:
* Prospect background snippet.
* Full email thread history.
* AI Generated Reply Draft (Editable).
* Quick Actions: `Send AI Reply`, `Edit & Send`, `Mark as Converted`, `Blacklist Lead`.



---

## 8. Business Rules

1. **Strict Sequence Pause on Reply:** No lead shall receive an automated sequence email after replying, regardless of sentiment, until manually unpaused or auto-handled by reply logic.
2. **Global Domain Suppression:** If any email at a target company domain marks outreach as spam or requests removal, all future outreach to leads at that domain requires explicit user override.
3. **Inbox Rotation Balance:** Daily email load must be distributed evenly across all active sending accounts to avoid hitting vendor velocity triggers.
4. **Unsubscribe Respect:** Every cold outreach email must include an unobtrusive, one-click opt-out option or compliant text opt-out phrasing.

---

## 9. Automation Rules

* **Rule 1: High Interest Notification:** *IF* reply classification = `Interested`, *THEN* send immediate push notification / email alert to user within 60 seconds.
* **Rule 2: Auto-Blacklist:** *IF* reply sentiment = `Unsubscribe` OR bounce type = `Hard Bounce`, *THEN* automatically insert lead email and company domain into global suppression list.
* **Rule 3: OOO Reactivation:** *IF* auto-responder detected with explicit date, *THEN* calculate resumption date and schedule next sequence step for 09:00 AM recipient time on that date.
* **Rule 4: Multi-Open Alert:** *IF* lead opens an email 4+ times within 24 hours without replying, *THEN* flag lead as "Hot Prospect" on user dashboard.

---

## 10. Edge Cases & Mitigation Strategies

| Scenario / Edge Case | System Behavior | Safeguard Action |
| --- | --- | --- |
| **Accidental Multi-Ingestion** | Lead email exists in multiple campaigns | Prevent duplicate import; notify user of existing lead status |
| **Ambiguous Reply Intent** | AI confidence score < 80% for sentiment classification | Fallback to `Manual Review Required`; send simple notification to user |
| **Sending Domain Health Drop** | Bounce rate on an inbox exceeds 4% in 24 hours | Automatically pause inbox sending and switch queued emails to alternative connected domains |
| **Email Service Rate Limit Hit** | Provider returns throttle error | Auto-pause sending queue for 1 hour; retry with exponential backoff |

---

## 11. Future Features (V2 & Beyond)

* **Multi-Channel LinkedIn Sync:** Automated connection requests and soft touchpoints integrated into email sequences.
* **Call Task Automation:** Triggering phone task creation for high-value leads upon second positive interaction.
* **A/B Content Testing:** Automatic winner selection based on positive reply rates rather than open rates.

---

## 12. Version Roadmap

```
  Phase 1: V1.0 Core Engine ──► Phase 2: V1.5 Reply Intelligence ──► Phase 3: V2.0 Scale & Expand
  • Cold email sequence builder  • AI reply classification         • LinkedIn multi-channel steps
  • Lead ingestion & validation  • Suggested draft replies         • Advanced inbox warm-up metrics
  • Basic master inbox view      • One-click auto-responses        • A/B testing on reply conversions

```

---

## 13. Success Metrics

* **Deliverability Rate:** $\ge 98\%$ across active sending accounts.
* **Positive Reply Ratio:** $\ge 10\%$ of total replies categorized as positive interest.
* **Zero Manual Lead-State Management:** 100% of lead status transitions (Active, Replied, Suppressed) handled autonomously by workflow rules.
* **User Time Saved:** Reduce daily outreach management overhead to $< 15$ minutes per day.
