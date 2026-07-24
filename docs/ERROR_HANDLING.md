# ERROR_HANDLING.md

## Principles

- Never silently fail.
- Log every unexpected error.
- Return structured error responses.
- Retry only transient failures.
- Never retry validation failures.

## Retry Strategy

Database Timeout
→ Retry

Gemini Timeout
→ Retry

Email Provider Timeout
→ Retry

Validation Error
→ Do Not Retry

Authentication Error
→ Do Not Retry

## Logging Levels

INFO

WARN

ERROR

FATAL

## Standard Error Response

{
  success: false,
  error: {
    code,
    message,
    details
  }
}
