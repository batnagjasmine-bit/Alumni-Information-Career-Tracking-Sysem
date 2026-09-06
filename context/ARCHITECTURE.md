# System Architecture & Technical Specifications
## Alumni Information Career Tracking System (AICTS)

---

## 1. Architectural Overview

AICTS leverages a modern, high-performance hybrid cloud architecture:
- **Application Framework**: Next.js 14+ (App Router, Server Components, Route Handlers).
- **Presentation Layer**: React 18, Tailwind CSS, shadcn/ui (Radix primitives), Recharts for data visualization, Sonner for reactive toast feedback.
- **Data Persistence**: Supabase PostgreSQL managed instance.
- **ORM & Type Safety**: Prisma ORM 7.x configured with client extensions and introspected database schemas.
- **Identity & Auth**: Supabase Auth (JWT sessions with secure HTTP-only cookies).
- **Object Storage**: Supabase Storage buckets for alumni resumes and profile media.
- **Communication & Automation**: Resend API for transactional email, Vercel Cron for automated daily job expiration.

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT BROWSER                         │
│   Next.js Client Components (React Hook Form + Zod UI)      │
└──────────────┬───────────────────────────────┬──────────────┘
               │ HTTPS (Cookies/Session)       │ Realtime / Storage
               ▼                               ▼
┌──────────────────────────────┐  ┌───────────────────────────┐
│     NEXT.JS APP ROUTER       │  │      SUPABASE CLOUD       │
│  - Server Components (SSR)   │  │  - Auth (JWT / Sessions)  │
│  - Route Handlers (app/api)  │  │  - Storage (Buckets)      │
│  - Middleware (proxy.ts)     │  │  - Realtime subscriptions │
└──────────────┬───────────────┘  └────────────┬──────────────┘
               │ Direct/Pooled connection       │ RLS
               ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 POSTGRESQL DATABASE (SUPABASE)              │
│       Prisma Client  ◄─────────────────►  Database Engine   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Hybrid Data Access Pattern

To ensure optimal performance, security, and developer ergonomics:

1. **Database Reads and Writes (Primary)**:
   - Executed via the centralized `prisma` client (`@/lib/prisma`).
   - Guarantees strict compile-time TypeScript validation across complex relational queries, nested joins, and transactions.
2. **Administrative Client**:
   - `createAdminClient()` (`@/lib/supabase/server`) utilizes the `SUPABASE_SERVICE_ROLE_KEY` for privileged background tasks (such as sending notifications and logging audit entries without RLS friction).
   - Never exposed to the browser or client-side bundles.
3. **Session & Auth Client**:
   - `createClient()` (`@/lib/supabase/server` and `@/lib/supabase/client`) manages session tokens, user claims, and client-side real-time events.

---

## 3. Data Preservation & Soft-Delete Architecture

In enterprise academic systems, permanent deletion (hard delete) creates cascade vulnerabilities and destroys accreditation historical data.

### Soft-Delete Implementation
- **Profiles (`profiles`)**:
  - Soft-deleted accounts set `is_active = false`.
  - When archived, `profiles.is_active` transitions to `false`.
  - Child records (`alumni`, `career_records`, `job_applications`, `messages`) remain fully linked and intact.
- **Career Records (`career_records`)**:
  - Individual job history items utilize `is_archived = true` and `archived_at = now()`.
- **Restoration**:
  - Dedicated `/restore` endpoints reset `is_active = true`, restoring immediate account privileges without data reconstructive overhead.

```
[Archive Request] ──► [Audit Log (ARCHIVE_ALUMNI)] ──► [Update profiles.is_active = false]
                                                    └──► [Update alumni.is_profile_public = false]
```

---

## 4. Temporal Analytics Engine (2026 Context)

The analytics engine (`/api/reports`) processes real-time database snapshots under strict temporal guards:

1. **Active Population Filtering**:
   - All aggregations enforce `profiles.is_active = true`.
   - Inactive/archived graduates and employers are excluded from active KPI cards.
2. **Deduplicated Multi-Job Aggregation**:
   - Uses set-based memory mapping to ensure an alumnus holding multiple concurrent positions is recorded as a single employed individual for cohort percentages.
3. **2026 Batch Trajectory Representation**:
   - Automatically sequences batch cohorts up to the current calendar year (**2026**).
4. **Temporal Job Postings**:
   - Active job counts enforce `status = 'active' AND expires_at > now()`, preventing overdue postings from inflating metrics prior to cron execution.

---

## 5. Vercel Production Deployment Architecture

The application is fully architected and validated for continuous deployment on **Vercel**:
- **Build Pipeline**: `prisma generate && next build` executes on every preview and production deploy, guaranteeing the Prisma client engine matches the target container architecture.
- **Route Manifest**: 52 static and dynamic routes compiled with zero build or type errors.
  - **Static Pages (○)**: Fast-loading dashboard shells, registration wizards, and public landing pages.
  - **Dynamic Route Handlers (ƒ)**: Protected API endpoints executing server-side session checks and role validation.
  - **Edge Middleware (ƒ Proxy)**: `proxy.ts` intercepting route requests to block unauthenticated or archived profiles.
- **Vercel Cron Integration**: Daily automated job expiration runs via `vercel.json` pointing to `/api/cron/expire-jobs` secured by `CRON_SECRET`.
- **Environment Matrix**: Requires `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `CRON_SECRET`.
