# Design System & UI Specifications
## Alumni Information Career Tracking System (AICTS)

---

## 1. Brand Identity & Visual Language

AICTS adheres to an institutional yet state-of-the-art aesthetic tailored for **Polytechnic College of La Union (PCLU)**. The interface balances academic authority with modern web ergonomics, featuring glassmorphism, responsive data visualizations, and micro-interactions.

### 1.1 Color System
- **Primary Navy (`pclu-navy`)**: `#0d2b5a` (HSL: `215, 75%, 20%`) — Academic prestige and authority.
- **Accent Sky (`pclu-sky`)**: `#0ea5e9` (HSL: `199, 89%, 48%`) — Interactive links, primary highlights, progress bars.
- **Institutional Gold (`pclu-yellow`)**: `#eab308` (HSL: `48, 96%, 47%`) — Honors, pinned announcements, pending status alerts.
- **Success Emerald**: `#10b981` (HSL: `160, 84%, 39%`) — Employed status, verified badges, approved employers.
- **Destructive / Alert Rose**: `#f43f5e` (HSL: `351, 95%, 61%`) — Unemployed status, rejections, archival actions.

---

## 2. Component Design Tokens

### 2.1 Glassmorphism & Elevation
- **Glass Container**:
  `bg-card/70 backdrop-blur-md border border-white/10 dark:border-white/5 shadow-sm`
- **Interactive Card**:
  `transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/40`

### 2.2 Stats Cards (`StatsCard`)
- 4-column responsive grid on desktop (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
- Radial background gradient blur matching the card's theme color.
- Lucide iconography wrapped in dynamic backdrop blur pill containers.

### 2.3 Status Badges (`StatusBadge`)
- **Active / Approved**: Emerald background pill with check icon (`bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20`).
- **Pending**: Amber background pill with clock icon.
- **Archived / Deactivated**: Rose/muted background pill with archive icon (`bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20`).

---

## 3. Data Visualization & Charts Palette

Recharts visualizations utilize high-contrast, accessible categorical tokens:

| Category / Metric | Color Code | Tailwind Class |
|---|---|---|
| Employed (Standard) | `#0ea5e9` | `bg-sky-500` |
| Self-Employed | `#10b981` | `bg-emerald-500` |
| Overseas Filipino Worker (OFW) | `#f59e0b` | `bg-amber-500` |
| Further Studies | `#8b5cf6` | `bg-purple-500` |
| Unemployed | `#f43f5e` | `bg-rose-500` |
| Retired / Other | `#64748b` | `bg-slate-500` |

### Chart Zero-State Protocol
When data arrays contain zero records (e.g. pending alumni survey intake):
1. **Never render an empty canvas** or broken layout.
2. Render a centered `<EmptyState>` card inside the chart container displaying an informational title (e.g. "Awaiting 2026 Survey Submissions"), a descriptive subtitle, and quick action links.

---

## 4. 2026 Command Center Temporal Header Pattern

The administrative command center header features a dedicated real-time temporal badge:
- Calendar icon with current formatted date (e.g. `Sunday, September 6, 2026`).
- Academic cycle pill: `AY 2025–2026 • 1st Semester`.
- System operational badge: `Live Analytics (2026)`.

---

## 5. Alumni Career Timeline & Milestone Dialog Tokens

### 5.1 Career Timeline Architecture
- **Left-Rail Gradient Connector**:
  `w-0.5 bg-gradient-to-b from-primary/30 via-border to-transparent` connecting chronological positions.
- **Node Avatars**:
  - Active: Filled emerald/primary pill with pulsing ring and `CheckCircle2` icon.
  - Previous: High-contrast 2-letter uppercase corporate monogram badge.
- **Tenure Duration Calculation**:
  Dynamic relative tenure chip (e.g., `Jan 2024 — Present • 2 yrs 8 mos`).
- **Tabbed Counter Badges**:
  Real-time badge counts: `Active Timeline (N)` and `Archived History (N)`.

### 5.2 Structured Milestone Dialog (`CareerRecordDialog`)
- **4-Phase Visual Hierarchy**:
  1. Employment Status & Role Duration (Accessible Radix switch for current role).
  2. Role & Organization (Company name, Job title, Employment classification, Philippine Peso `₱` salary bands).
  3. Industry & Scope (PCLU standard sector, Country, and Municipality).
  4. Timeline & Key Achievements (Start/End dates and rich description textarea with 1,000-character live counter).
