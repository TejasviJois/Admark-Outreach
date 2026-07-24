# AI_GUIDELINES.md

## 1. Prompt Design Principles

* **Strict Persona & Scope Directives:** Every system prompt must define a clear role, strict boundary parameters, and explicit prohibition of unauthorized actions or formatting deviation.
* **Deterministic Output Instructions:** Specify exact response formats using unambiguous rules (e.g., "Output MUST be raw JSON adhering to the target schema. Do NOT include Markdown formatting, code block backticks, or conversational text.").
* **Context Priming & Constraints First:** Place system instructions, constraints, and standard formats at the top of the prompt to maximize attention mechanisms, followed by variables and variable context.
* **Few-Shot In-Context Examples:** Provide zero-shot inputs with structured target outputs for complex reasoning tasks (e.g., reply classification, prospect outreach personalization) to steer output distribution accurately.

---

## 2. Structured Output Standards

* **JSON-Only Enforcement:** Enforce strict standard JSON outputs across all model responses.
* **No Markdown Wrappers:** Eliminate triple backticks (`json ... `) and inline code formatting in prompt instructions to save tokens and avoid JSON parsing errors.
* **Standardized JSON Envelope Structure:**
```json
{
  "data": {},
  "meta": {
    "model": "string",
    "timestamp": "string"
  },
  "error": null
}

```



---

## 3. JSON Schema Standards

* **Schema Uniformity:** Define schemas via standard OpenAPI 3.0 or JSON Schema draft-07 standards.
* **Field-Level Strictness:**
* All object properties must explicit `type` definitions.
* Require `additionalProperties: false` to avoid unmapped field generation.
* Define explicit required fields array.
* Use string strictness limits (`enum` for known categorical choices; `minLength`/`maxLength` for text fields).


* **Schema Validation Pre-Processing:** Programmatically sanitize schemas before prompt injection to remove unsupported keys (`$schema`, `title`, custom metadata attributes).

---

## 4. Temperature Strategy

| Task Category | Temperature | Top_P | Rationale |
| --- | --- | --- | --- |
| **Reply Classification** | `0.0` | `1.0` | Eliminates stochastic behavior for deterministic categorical classification. |
| **Lead Research Extraction** | `0.0` | `1.0` | Guarantees strict compliance with factual facts extracted from prospect data. |
| **Email Generation** | `0.3` | `0.9` | Provides light variance and natural tone while preventing creative divergence from sales messaging rules. |
| **Fallback / Recovery Logic** | `0.0` | `1.0` | Absolute determinism required during error correction passes. |

---

## 5. Prompt Versioning

* **Semantic Version Format:** `[domain].[task].v[major].[minor]` (e.g., `outreach.email_gen.v1.0`, `reply.classification.v2.1`).
* **Major Version Bump Rules:** Prompts undergo major updates when the target JSON schema changes, breaking backwards compatibility.
* **Minor Version Bump Rules:** Prompts undergo minor updates for phrasing adjustments, target tone tweaks, or adding few-shot examples without structural schema changes.
* **Prompt Registry Object:** Prompts must be cataloged with their corresponding strict schema version and target model parameters.

---

## 6. Evaluation Framework

* **Golden Datasets:** Maintain a curated evaluation dataset containing realistic company research data, raw email replies, edge-case texts, and cold outreach samples.
* **Metric Targets:**
* **JSON Validity Rate:** Target $\ge 99.9\%$ syntactically correct JSON.
* **Schema Adherence:** Target $100\%$ schema matching (no extra/missing required keys).
* **Classification Precision/Recall:** Target $\ge 95\%$ across key categories (Interested, Not Interested, Out of Office, Unsubscribe).


* **Automated Benchmarking Workflow:** Run automated test suites against golden datasets prior to deploying prompt version updates.

---

## 7. Retry Strategy

* **Immediate Programmatic Validation Retry:**
* If initial output fails JSON execution or schema verification, initiate an explicit retry pass.


* **Context Injection on Retry:**
* Inject the original prompt, the erroneous model response, and the specific validation error message into the error recovery prompt context.


* **Bounded Retries:** Limit automated retries to a maximum of 2 attempts before escalating to the Fallback Strategy.

---

## 8. Fallback Strategy

* **Tier 1 - Secondary Model Pass:** Redirect failed prompts to a fallback model family if the primary model produces non-parsable outputs twice consecutively.
* **Tier 2 - Rule-Based Fail-Safe Output:**
* *For Classification:* Default to a safe category (e.g., `NEEDS_HUMAN_REVIEW`).
* *For Research/Generation:* Return a standardized base template requiring manual approval before sending.


* **Alert Execution:** Log recurring failures to error tracking systems to notify system maintenance without breaking runtime execution flow.

---

## 9. Validation Strategy

* **Layer 1 (Syntax):** Parse output string with standard JSON parser (`JSON.parse`). Failure triggers explicit error retry.
* **Layer 2 (Schema Enforcement):** Validate the parsed object against strict schema definitions (e.g., Zod schemas) to check key types, ranges, enum validity, and required field inclusion.
* **Layer 3 (Business Logic Guardrails):** Validate semantic constraints (e.g., checking that generated personalized email text contains mandatory unsubscribes or does not exceed character boundaries).

---

## 10. Classification Standards

* **Strict Enum Boundaries:** Classifications are limited strictly to pre-defined canonical values:
* `INTERESTED`
* `NOT_INTERESTED`
* `OUT_OF_OFFICE`
* `UNSUBSCRIBE`
* `NEEDS_HUMAN_REVIEW`


* **Multi-Label Ambiguity Protocol:** If an incoming message exhibits traits of multiple categories (e.g., expressing interest while asking to be contacted later due to time off), prioritize the actionable outcome or fallback to `NEEDS_HUMAN_REVIEW`.
* **Zero-CoT Classification Output:** Direct classification prompts must return target classification fields directly without verbose thinking chains to minimize latency and token spend.

---

## 11. AI Cost Optimization

* **Token-Efficient Prompt Formatting:** Strip unnecessary adjectives, polite phrasing, and redundant formatting instructions from prompt system instructions.
* **Caching Dynamic Contexts:** Structure system instructions and static schemas at the start of prompts to maximize provider prompt caching mechanisms.
* **Task Segmentation:** Separate analytical tasks (e.g., detailed company research extraction) from output composition tasks to avoid re-sending large context payloads in creative cycles.

---

## 12. Token Optimization

* **Concise Context Trimming:** Truncate long context payloads (such as scraped prospect websites) to the key sections containing core value propositions and company descriptions.
* **Condensed JSON Response Keys:** Use short, descriptive camelCase keys in JSON output schemas rather than verbose phrase keys.
* **Elimination of Deduplicative Responses:** Require the AI to output *only* final structural values without re-quoting input fields.

---

## 13. Hallucination Prevention

* **Strict Retrieval-Bound Constraints:** Embed explicit system instructions: *"Extract or write facts using ONLY the provided input text. If a piece of information is not present, mark the corresponding JSON value as null."*
* **Verification Field Inclusion:** Include explicit source justification fields within structured outputs where applicable to force explicit referencing before final text generation.
* **Prohibit Dynamic Field Invention:** Enforce `additionalProperties: false` at schema level to reject untrusted field creation.

---

## 14. Output Validation

```
                   +------------------------+
                   |    LLM Raw Output      |
                   +-----------+------------+
                               |
                               v
                  /--------------------------\
                 /  Syntax Check: Raw JSON?   \--- No ---> Trigger Retry
                 \----------------------------/            (Max 2 Attempts)
                               | Yes
                               v
                  /--------------------------\
                 / Standard Schema Matching?  \--- No ---> Trigger Retry
                 \----------------------------/            (Max 2 Attempts)
                               | Yes
                               v
                  /--------------------------\
                 /  Business Rule Bounds?    \--- No ---> Fallback Strategy
                 \----------------------------/            (Human Review)
                               | Yes
                               v
                    +----------------------+
                    |  Validated Output    |
                    +----------------------+

```

* **Step 1:** String parsing validation to catch markdown syntax, trailing commas, or incomplete structures.
* **Step 2:** Schema matching (data type checking, standard field evaluation, requirement enforcement).
* **Step 3:** Business boundary validation (word count limits, ban on generic filler words, sanity checking dynamic fields).

---

## 15. Future Multi-model Support

* **Model-Agnostic Prompt Abstraction:** Decouple specific system instructions into provider-neutral templates, keeping parameter declarations isolated from system context logic.
* **Schema Portability:** Standardize output schemas in language-agnostic format to allow seamless interchange between Gemini, OpenAI, and Anthropic models.
* **Normalized Model Adapters:** Enforce standardized interface parameters across all prompt tasks (`temperature`, `max_tokens`, `schema`, `prompt_version`) regardless of target provider syntax.
