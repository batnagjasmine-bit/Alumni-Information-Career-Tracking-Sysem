# System Engineering Rules & Behavioral Guidelines
## Alumni Information Career Tracking System (AICTS)

---

## 1. Data Deletion & Archival Rules (Zero Hard Deletes)

> [!CRITICAL]
> **Rule 1.1**: NEVER execute permanent `DELETE` SQL/Prisma operations against primary identities (`profiles`, `alumni`, `employers`).
> - Deleting an alumnus or employer MUST perform an **Archival (Soft Delete)** by mutating `profiles.is_active = false`.
> - Career records MUST perform soft deletion by mutating `career_records.is_archived = true` and recording `archived_at = new Date()`.
> - Always provide a paired `restore` endpoint and UI action to re-activate records.

> [!IMPORTANT]
> **Rule 1.2**: All `GET` routes and aggregate calculations must filter by default:
> - Active directories and rosters: enforce `profiles.is_active = true`.
> - Career timelines: enforce `career_records.is_archived = false`.
> - Filter tabs for administrators MUST explicitly partition active vs archived records.

---

## 2. 2026 Temporal Awareness & Date Rules

1. **System Year**: The active operational calendar year is **2026**.
2. **Date Formatting**:
   - UI relative times (e.g. `formatDistanceToNow`) must be accompanied by full 2026 formatted timestamps (`format(date, "MMM d, yyyy • h:mm a")`) to guarantee precise administrative auditing.
   - Batch and graduation years must dynamically generate up to `new Date().getFullYear()` (2026).
3. **Temporal Filtering**:
   - Job postings are active if and only if `status === 'active' && new Date(expires_at) > new Date()`.
   - Expired job postings must not be rendered as live vacancies regardless of whether the scheduled cron has executed yet.

---

## 3. Architecture & API Rules

1. **Prisma ORM for Data Mutation**:
   - All relational reads, updates, and transactions must use `@/lib/prisma`.
   - Supabase client is reserved for Auth, Storage, and Realtime event streaming.
2. **Service Role Security**:
   - Never import or expose `SUPABASE_SERVICE_ROLE_KEY` inside client bundles or `"use client"` components.
   - All administrative actions require authenticated session role validation (`profile.role === 'admin'`).
3. **Consistent API Response Shape**:
   - Every API Route Handler must return a standard payload:
     `{ data?: T, error?: string }` with appropriate HTTP status codes.
4. **Mandatory Audit Logging**:
   - Administrative actions altering user status, approving jobs, archiving records, or restoring profiles MUST call `logAudit()` with explicit old and new values.

---

## 4. UI / Component Rules
1. Use **shadcn/ui** primitives exclusively. Do not write ad-hoc modal dialogs or raw form controls.
2. Forms must validate against strict **Zod** schemas via `@hookform/resolvers/zod`.
3. Provide descriptive empty states and loading skeletons for all charts and data tables. Never render a blank void when data arrays are empty.
