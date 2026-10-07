<div align="center">

# Segbaji & Son — Core API

### The backend powering segbajisons.com — public website + internal admin dashboard, one unified API.

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

[Live API](https://segbajisons.com) · [Report a Bug](../../issues) · [Request a Feature](../../issues)

</div>

---

## Table of Contents

- [Segbaji \& Son — Core API](#segbaji--son--core-api)
    - [The backend powering segbajisons.com — public website + internal admin dashboard, one unified API.](#the-backend-powering-segbajisonscom--public-website--internal-admin-dashboard-one-unified-api)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [The Problem This Solves](#the-problem-this-solves)
  - [Key Features](#key-features)
    - [🌐 Public-Facing](#-public-facing)
    - [🔐 Admin Dashboard](#-admin-dashboard)
  - [Architecture at a Glance](#architecture-at-a-glance)
  - [Permission Model — Why It's Different](#permission-model--why-its-different)
  - [Tech Stack](#tech-stack)
  - [API Modules](#api-modules)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Project Structure](#project-structure)
  - [Notification Pipeline](#notification-pipeline)
  - [Deployment](#deployment)
  - [Engineering Highlights](#engineering-highlights)
  - [Author](#author)

---

## Overview

Segbaji & Son Nig. Ltd. is a corporate & construction services company — civil engineering, surveying, land sales, and project delivery. This repository is the **single NestJS API** that drives both halves of their digital presence:

| Surface | Who uses it | What it needs |
|---|---|---|
| **Public website** (segbajisons.com) | Prospective clients, site visitors | Service listings, project gallery, quote requests, contact forms |
| **Admin dashboard** | Super Admins, Department Leads, Staff | Lead management, task assignment, team oversight, content publishing |

Rather than two codebases drifting out of sync, one API serves both — with a permission system that decides, per request, exactly how much of the data each caller is allowed to see.

---

## The Problem This Solves

A small-to-mid-size services company doesn't just need a marketing site — it needs the operational layer behind it: someone has to see the leads that come in, route them to the right department, assign tasks, and make sure nothing falls through the cracks. Most teams solve this with scattered tools (a contact form that emails one inbox, a spreadsheet for tracking leads, WhatsApp for task handoff). That doesn't scale past a handful of people, and it has no audit trail.

This API replaces that patchwork with:

- **One source of truth** for every quote request, contact message, client, and project — queryable, filterable, exportable.
- **Department-aware routing** — a quote request for a surveying service reaches the surveying team's lead automatically, not a shared inbox everyone ignores.
- **Real-time visibility** — in-app + email notifications fire the moment something needs attention, instead of relying on someone checking a shared inbox.
- **Granular access control** — a Department Lead sees their department's leads and tasks; they do **not** see payroll-adjacent team data or another department's pipeline. Super Admins see everything.

---

## Key Features

### 🌐 Public-Facing
- Service catalogue with categories, descriptions, and hero imagery
- Project gallery (photos + video) with automatic thumbnail fallback for video-only entries
- Quote request submission, tied to a specific service and routed to the right department
- General contact form, triaged centrally by Super Admins
- Public "Meet the Team" listing — opt-in, curated display order
- Property listings with live availability status

### 🔐 Admin Dashboard
- **Personalized, permission-driven dashboard** — one endpoint (`/dashboard/me`) returns a different shape depending on who's asking, with a `capabilities` object so the frontend never has to guess from a role name
- **Lead management** — quote requests and contact messages, with status tracking (`NEW → CONTACTED → WON/LOST`) and one-click conversion to a `Client` record
- **Task management** — department-scoped task assignment, reassignment, and tracking
- **Team management** — invite, promote to Department Lead, deactivate, reassign department/role
- **Company-wide analytics** — team composition, lead funnel, property/project breakdowns (Super Admin only)
- **Content publishing** — services, projects, and properties, with safe-delete guards (e.g. a service tied to existing quote requests can't be hard-deleted, only retired)

---

## Architecture at a Glance

```
┌─────────────────────┐        ┌─────────────────────┐
│   Public Website     │        │   Admin Dashboard     │
│   (segbajisons.com)  │        │   (internal)          │
└──────────┬───────────┘        └──────────┬───────────┘
           │                               │
           │         REST / JSON           │
           └───────────────┬───────────────┘
                            │
                  ┌─────────▼─────────┐
                  │     NestJS API     │
                  │  (this repo)       │
                  ├────────────────────┤
                  │ Auth & RBAC        │
                  │ Services           │
                  │ Quote Requests     │
                  │ Contact Messages   │
                  │ Clients            │
                  │ Projects/Gallery   │
                  │ Tasks              │
                  │ Dashboard          │
                  │ Notifications      │
                  └─────┬───────┬──────┘
                        │       │
          ┌─────────────▼┐   ┌──▼──────────────┐
          │  PostgreSQL   │   │  Redis + BullMQ  │
          │  (Neon)       │   │  (jobs, cache)   │
          └───────────────┘   └──────────────────┘
                        │
          ┌─────────────▼──────────────┐
          │ Cloudinary · Zoho ZeptoMail │
          │ (media)        (email)      │
          └──────────────────────────────┘
```

---

## Permission Model — Why It's Different

Most small APIs gate access by checking a user's **role name** ("if role === 'Admin'"). That breaks the moment you need someone to have two kinds of authority at once — which is exactly what happened here: a Department Lead isn't a separate *role*, it's a **responsibility layered on top of** whatever professional role someone already has (Engineer, Surveyor, Sales Officer, etc.).

Instead, this API uses:

1. **Flat permission strings** (`"leads:read"`, `"tasks:write"`, `"*:write"` for org-wide wildcards) attached to each `Role`.
2. An independent **`isTeamLead`** boolean on the user, decoupled from their role — so "Engineer + Department Lead" and "Engineer" alone both exist without duplicating the role table.
3. At login/refresh, the two are **folded together** into the JWT's effective permission set — so every downstream check is a single, fast, permission-string comparison, never a role-name string match.
4. The `/dashboard/me` endpoint pre-computes a **`capabilities`** object (`isOrgWide`, `canManageDepartmentTasks`, `canManageDepartmentLeads`, `canViewDepartmentRoster`) so the frontend renders the right dashboard without ever interpreting a raw permission string itself.

This closed a real gap during development: Team Leads with `leads:read` were initially able to see **every** department's general contact inquiries, not just their own department's quote requests. The fix — splitting `contact-messages:*` into its own permission pair, separate from `leads:*` — is the kind of boundary this model is built to make easy to enforce and hard to accidentally re-break.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Framework** | [NestJS](https://nestjs.com/) | Modular, testable, convention-driven — scales cleanly as modules multiply |
| **Language** | TypeScript | End-to-end type safety from DTO to database |
| **ORM** | [Prisma 7](https://www.prisma.io/) | Type-safe queries, declarative schema, first-class migrations |
| **Database** | PostgreSQL ([Neon](https://neon.tech/) — serverless) | Relational integrity for a domain full of foreign keys (departments → services → quote requests → clients) |
| **Cache / Queue** | Redis + [BullMQ](https://docs.bullmq.io/) | Background jobs (notifications, reminders) decoupled from the request/response cycle |
| **Media** | [Cloudinary](https://cloudinary.com/) | Upload size limits, video-duration capping, automatic thumbnail generation |
| **Transactional Email** | [Zoho ZeptoMail](https://www.zoho.com/zeptomail/) | SPF/DKIM/DMARC-authenticated sending — fixes deliverability that a raw SMTP relay can't guarantee |
| **Auth** | JWT + refresh-token rotation | Stateless verification, short-lived access tokens, revocable sessions |
| **Hosting** | [Render](https://render.com/) (API) · [Vercel](https://vercel.com/) (frontend) | |

---

## API Modules

| Module | Responsibility |
|---|---|
| `auth` | Login, token refresh, invite-based onboarding, permission folding |
| `team-members` | Staff CRUD, department-lead promotion, public team listing |
| `departments` | Department registry — the scoping unit for leads and tasks |
| `services` | Service catalogue (category, description, hero image, department ownership) |
| `quote-requests` | Department-routed leads, status pipeline, client conversion |
| `contact-messages` | Org-wide general inquiries (intentionally un-scoped — always reach Super Admins) |
| `clients` | Converted leads / confirmed clients |
| `projects` | Public project gallery (photo + video) |
| `properties` | Property listings with availability status |
| `tasks` | Department-scoped task assignment and tracking |
| `dashboard` | The polymorphic `/dashboard/me` personalized overview + company-wide `/dashboard/overview` |
| `notifications` | Fire-and-forget in-app + email notification pipeline |
| `mail` | ZeptoMail transport wrapper |
| `cloudinary` | Media upload/delete wrapper |

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- PostgreSQL database (Neon or self-hosted)
- Redis instance
- Cloudinary account
- Zoho ZeptoMail account (or any SMTP-compatible provider for local dev)

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-org>/segbaji-api.git
cd segbaji-api

# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env

# Run database migrations
npx prisma migrate deploy

# Generate the Prisma client
npx prisma generate

# Start in development mode
npm run start:dev
```

The API will be available at `http://localhost:3000` by default, with Swagger documentation at `http://localhost:3000/api`.

---

## Environment Variables

```env
# Database
DATABASE_URL=            # Pooled connection string (Neon)
DIRECT_URL=               # Direct connection string — used by Prisma Migrate only

# Auth
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Redis / Queue
REDIS_URL=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email (Zoho ZeptoMail)
ZEPTOMAIL_API_KEY=
MAIL_FROM_ADDRESS=
ADMIN_NOTIFICATION_EMAIL=

# App
PORT=3000
FRONTEND_URL=https://segbajisons.com
```

> **Note on `DIRECT_URL`:** this must point at your actual database, not an auto-generated shadow database. A misconfigured `DIRECT_URL` will cause `prisma migrate dev` to report success while writing to the wrong database entirely — always confirm with `npx prisma migrate status` after any connection-string change.

---

## Project Structure

```
src/
├── auth/                 # Login, refresh, invites, permission folding
├── common/
│   ├── permissions/       # hasPermission util, PERMISSIONS constants
│   ├── pagination/
│   └── prisma/
├── dashboard/             # Personalized + company-wide overview
├── departments/
├── services/
├── quote-requests/
├── contact-messages/
├── clients/
├── projects/
├── properties/
├── tasks/
├── team-members/
├── notifications/
├── mail/
├── cloudinary/
└── main.ts
prisma/
├── schema.prisma
└── migrations/
```

---

## Notification Pipeline

Every meaningful business event — a new quote request, a new contact message, a task assignment or reassignment, a new chat message — triggers a **fire-and-forget** notification, so a failed send never blocks or costs the user their submitted action.

```
Event occurs (e.g. quote request submitted)
        │
        ▼
Resolve recipients: Super Admins ∪ relevant Department Leads
   (deduplicated — a Super Admin who is also a Department Lead
    gets exactly one notification, not two)
        │
        ├──► In-app notification (persisted, unread-count tracked)
        │
        └──► Email (ZeptoMail, SPF/DKIM/DMARC authenticated)
```

Recipient resolution is **department-scoped by design**: a quote request for a surveying service notifies the surveying department's lead(s) plus Super Admins — not the entire admin team. `ContactMessage` (general inquiries) is the one deliberate exception: it has no department owner, so it always routes to Super Admins only.

---

## Deployment

| Component | Platform |
|---|---|
| API | Render |
| Frontend | Vercel |
| Database | Neon (serverless Postgres) |
| Redis | Redis Cloud |

Migrations run via `npx prisma migrate deploy` as part of the deploy step — never `migrate dev` in production, since it requires a shadow database and is meant for local schema iteration only.

---

## Engineering Highlights

A few things worth calling out from the build, for anyone reviewing this codebase:

- **Permission-folding RBAC** — department-lead authority layered onto a user's existing role via JWT claim folding, instead of duplicating the role table or forcing role exclusivity.
- **Caught and closed a real data leak** — lead-visibility permissions for quote requests and general contact inquiries were initially shared; split into dedicated permission pairs to restore department-level boundaries.
- **Root-caused a silent migration failure** — a misconfigured direct-connection string was pointing at an orphaned shadow database; all migrations were "succeeding" against the wrong target. Traced via `prisma migrate status` and corrected.
- **Fixed lead notifications landing in spam** — migrated from an unauthenticated SMTP relay to Zoho ZeptoMail with full SPF/DKIM/DMARC domain authentication.
- **Denormalized department routing** — `QuoteRequest.departmentId` is copied from `Service.departmentId` at creation time, so reassigning a service later never retroactively re-routes historical leads.

---

## Author

**Okoro Omaka** — Backend Engineer
[github.com/Okoro-Omaka](https://github.com/Okoro-Omaka) · jusmaks45@gmail.com

---

<div align="center">

Built for Segbaji & Son Nig. Ltd.

</div>