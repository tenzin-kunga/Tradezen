# Trade Journal App – Non-Negotiable Rules & Guidelines

## 1. Data Integrity Rules

* Trades **must never be silently modified or deleted** by the system.
* All user-entered data must be preserved unless explicitly deleted by the user.
* Any calculated field (e.g., PnL) must be:

  * Deterministic
  * Reproducible from stored inputs
* Time values must always be stored in **UTC**.
* Prices must be stored as **raw numeric values (no rounding during storage)**.

---

## 2. Trade Calculation Rules

* PnL must always be calculated using:

  ```
  PnL = (Exit Price - Entry Price) * Lot Size (adjusted for direction)
  ```
* Direction must strictly affect calculation:

  * Buy → (Exit - Entry)
  * Sell → (Entry - Exit)
* Risk/Reward must always be derived from:

  ```
  Risk = |Entry - Stop Loss|
  Reward = |Take Profit - Entry|
  ```
* Calculations must not depend on live price feeds—only stored trade data.

---

## 3. UX Consistency Rules

* Profit must always be shown in **green**.
* Loss must always be shown in **red**.
* Neutral values must use **gray/neutral color**.
* Primary action ("Add Trade") must always be:

  * Visible
  * Accessible within one click
* No screen should require more than **3 interactions to log a trade**.

---

## 4. Performance Rules

* Dashboard load time must be **< 2 seconds**.
* API responses must be **< 500ms (p95)**.
* Analytics queries must be optimized:

  * No full table scans on large datasets
* WebSocket updates must not exceed **1 update per second per symbol**.

---

## 5. Live Market Data Rules

* Live price data must:

  * Be clearly marked as **indicative (not authoritative)**
  * Never overwrite trade entry/exit values
* Cached prices must expire within **≤ 5 seconds**
* System must gracefully degrade if market API fails:

  * Show last known price
  * Display “stale data” indicator

---

## 6. Security Rules

* All endpoints must require authentication (except auth endpoints).
* Passwords must:

  * Be hashed (bcrypt or better)
  * Never be logged or exposed
* JWT tokens must:

  * Expire (≤ 24 hours)
  * Be securely stored (HTTP-only cookies recommended)
* User data must be strictly isolated:

  * No cross-user data access possible

---

## 7. Data Access Rules

* A user can only:

  * View their own trades
  * Modify their own trades
* All queries must include **user_id scoping**.
* No shared/global data unless explicitly designed (e.g., symbols table).

---

## 8. Import Rules (CSV)

* CSV import must:

  * Never overwrite existing trades
  * Validate all required fields before insertion
* Invalid rows must:

  * Be skipped
  * Returned to user with error reason
* Import must be **idempotent-safe** where possible

---

## 9. System Reliability Rules

* No feature should cause:

  * Data loss
  * App crash
* Failures must be:

  * Logged
  * Recoverable
* External API failures must not break core functionality

---

## 10. Analytics Rules

* Analytics must always be:

  * Based on stored trades only
  * Consistent across refreshes
* Metrics definitions must never change silently
* Any change in calculation logic must:

  * Be versioned
  * Be documented

---

## 11. UI/UX Safety Rules

* No misleading metrics:

  * Always show sample size (e.g., number of trades)
* No hidden assumptions:

  * Clearly display how metrics are calculated
* Users must always be able to:

  * Edit
  * Delete
  * Verify their data

---

## 12. Scalability Rules

* System must support:

  * ≥ 100K trades per user without degradation
* Database queries must:

  * Use indexes on critical fields (user_id, symbol_id, date)
* Real-time features must:

  * Use caching (Redis)
  * Avoid direct DB polling

---

## 13. Logging & Monitoring Rules

* Log:

  * Errors
  * Failed imports
  * API failures
* Do NOT log:

  * Sensitive user data
  * Passwords or tokens
* Monitoring must include:

  * API latency
  * Error rates
  * WebSocket connections

---

## 14. Product Integrity Rules

* The app must never:

  * Encourage overtrading
  * Provide financial advice
* Messaging must remain:

  * Neutral
  * Data-driven

---

## 15. MVP Discipline Rules

* Do NOT:

  * Add features outside defined scope
  * Optimize prematurely
* Focus on:

  * Reliability
  * Simplicity
  * Accuracy

---

## 16. Git Workflow Rules

* Every task must be done on a **new branch** named according to the task.
* Changes must be:

  * Pushed to the task branch
  * Opened as a Pull Request targeting `develop`
* Do NOT push or merge task work directly into `main`.

---

# 🚨 Golden Rule

> **If a feature compromises data accuracy, user trust, or system stability — it must NOT be shipped.**

---
