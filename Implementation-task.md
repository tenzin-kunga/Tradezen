# 🚀 Tradezen — Implementation Tickets (Jira Style)

---

# 🧱 EPIC 1 — Monorepo & Project Setup

## 🎫 T1 — Setup Turborepo

**Description:** Initialize monorepo and clean default apps

**Tasks:**

* Create repo using Turborepo
* Remove default apps (`docs`, etc.)
* Create folders:

  * `apps/web`
  * `apps/api`
  * `packages/types`

**Acceptance Criteria:**

* `npm run dev` runs without errors
* Repo structure matches architecture

---

## 🎫 T2 — Setup Next.js App (web)

**Tasks:**

* Initialize Next.js with App Router
* Enable TailwindCSS
* Verify app runs on `localhost:3000`

**Acceptance Criteria:**

* Default page loads successfully

---

## 🎫 T3 — Setup NestJS App (api)

**Tasks:**

* Initialize NestJS project
* Run server on port 3001
* Enable CORS

**Acceptance Criteria:**

* API runs at `localhost:3001`

---

## 🎫 T4 — Setup Shared Types Package

**Tasks:**

* Create `packages/types`
* Export `Trade` type
* Configure TS path mapping

**Acceptance Criteria:**

* Types usable in both frontend and backend

---

# 🗄️ EPIC 2 — Database Layer

## 🎫 T5 — Setup PostgreSQL (Docker)

**Tasks:**

* Run PostgreSQL container
* Connect using `psql`

**Acceptance Criteria:**

* DB is accessible locally

---

## 🎫 T6 — Create Database & Table

**Tasks:**

* Create database `tradezen`
* Create `trades` table
* Enable UUID extension

**Acceptance Criteria:**

* `\dt` shows `trades`

---

## 🎫 T7 — Backend DB Connection

**Tasks:**

* Install `pg`
* Create `db.ts`
* Test connection

**Acceptance Criteria:**

* Backend can query DB successfully

---

# ⚙️ EPIC 3 — Trade API

## 🎫 T8 — Create Trades Module

**Tasks:**

* Generate module, service, controller

**Acceptance Criteria:**

* Module compiles without errors

---

## 🎫 T9 — Implement POST /trades

**Tasks:**

* Accept trade input
* Compute PnL
* Insert into DB

**Acceptance Criteria:**

* Returns saved trade with PnL

---

## 🎫 T10 — Implement GET /trades

**Tasks:**

* Fetch all trades
* Sort by latest

**Acceptance Criteria:**

* Returns list of trades

---

## 🎫 T11 — Test API via Postman

**Tasks:**

* Test POST
* Test GET

**Acceptance Criteria:**

* Data persists correctly

---

# 🎨 EPIC 4 — Frontend Core

## 🎫 T12 — Setup API Helper

**Tasks:**

* Create `lib/api.ts`
* Add functions:

  * `createTrade`
  * `getTrades`

**Acceptance Criteria:**

* API calls succeed from frontend

---

## 🎫 T13 — Build Add Trade Page

**Tasks:**

* Create form inputs:

  * symbol, entry, exit, lot, direction
* Submit to backend

**Acceptance Criteria:**

* Trade is saved in DB

---

## 🎫 T14 — Build Trade List Page

**Tasks:**

* Fetch trades
* Display list

**Acceptance Criteria:**

* Trades visible in UI

---

## 🎫 T15 — Basic Navigation

**Tasks:**

* Add links:

  * Add Trade
  * Trades

**Acceptance Criteria:**

* User can navigate between pages

---

# 🔗 EPIC 5 — Integration

## 🎫 T16 — End-to-End Flow

**Tasks:**

* Add trade via UI
* Verify DB entry
* Verify UI display

**Acceptance Criteria:**

* Full flow works without errors

---

# 📊 EPIC 6 — Dashboard (Basic Analytics)

## 🎫 T17 — Backend Metrics API

**Tasks:**

* Calculate:

  * Total PnL
  * Win rate

**Acceptance Criteria:**

* Endpoint returns correct metrics

---

## 🎫 T18 — Dashboard UI

**Tasks:**

* Show:

  * Total PnL
  * Win rate

**Acceptance Criteria:**

* Metrics visible on dashboard

---

# ⚡ EPIC 7 — Real-Time Market Data

## 🎫 T19 — Market Data Service

**Tasks:**

* Integrate external API (e.g., Twelve Data)
* Fetch prices

**Acceptance Criteria:**

* Returns live price for symbol

---

## 🎫 T20 — Redis Setup

**Tasks:**

* Install Redis (Docker)
* Store price data

**Acceptance Criteria:**

* Prices cached in Redis

---

## 🎫 T21 — WebSocket Server

**Tasks:**

* Setup WebSocket in NestJS
* Broadcast price updates

**Acceptance Criteria:**

* Clients receive updates

---

## 🎫 T22 — Frontend Live Prices

**Tasks:**

* Connect to WebSocket
* Display live prices

**Acceptance Criteria:**

* UI updates in real-time

---

# 🧪 EPIC 8 — Stability & Quality

## 🎫 T23 — Error Handling

**Tasks:**

* Handle API failures
* Handle DB errors

---

## 🎫 T24 — Validation

**Tasks:**

* Validate inputs (backend)

---

## 🎫 T25 — Logging

**Tasks:**

* Log errors
* Log API calls

---

# 🚀 EPIC 9 — Deployment

## 🎫 T26 — Deploy Backend

**Tasks:**

* Deploy to AWS (EC2/ECS)

---

## 🎫 T27 — Deploy Frontend

**Tasks:**

* Deploy to Vercel

---

## 🎫 T28 — Environment Config

**Tasks:**

* Add `.env` support
* Configure API URLs

---

# 🎯 MVP Definition

You are DONE when:

* ✅ Add trade works
* ✅ Data saved in DB
* ✅ Trades visible
* ✅ Basic dashboard works

---

# 🧠 Execution Strategy

Follow this order:

```
1 → 2 → 3 → 4 → 5 → MVP DONE
```

Then:

```
6 → 7 → 8 → 9
```

---

# 🚀 Notes

* Do not skip steps
* Validate each ticket before moving forward
* Keep commits small and focused

---
