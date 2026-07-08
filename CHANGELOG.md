# Adwyzors ERP — Phase Changelog

> Append each phase summary here after completion. Keeps the team aligned on what changed.

---

## Phase 1 — Multi-Tenant Core & Auth Engine

**Completed**: 2026-07-08  
**Scope**: UI design system, audit engine, password recovery, RBAC enforcement, tenant management, app shell

---

### New Packages

| Package | Purpose |
|---------|---------|
| `packages/ui` | Shared component library (Button, Input, Card, Badge, Avatar, Dialog, DropdownMenu, Table, Breadcrumb, Sidebar, ThemeProvider) using Radix + CVA + Tailwind |
| `packages/audit` | `writeAuditLog()` — non-blocking DB writes. `withAudit()` — wraps handlers with auto-logging |

### New Database Model

- **`PasswordResetToken`** — one-time-use tokens for password recovery (1h expiry, single-use enforcement)
- Migration: `20260708165435_add_password_reset_token`

### Auth Additions

- **`getUserPermissions(userId, tenantId)`** in `packages/auth` — resolves User → Role → Permission chain. SUPER_ADMIN returns `["*"]`. Deduplicates across multiple roles.

### Password Recovery Flow

- `/forgot-password` — email form, generates crypto token, logs reset URL to terminal (no email server needed in dev). Always returns success (no enumeration).
- `/reset-password?token=...` — validates token (exists, not expired, not used), hashes new password, writes audit log. Redirects to login with success toast.

### API Routes (all follow the standard: auth + permissions + Zod validation + audit + error handling)

**Super Admin** (`/api/super-admin/tenants`):
- `GET /` — paginated list with search
- `POST /` — create tenant with default TENANT_ADMIN + TENANT_USER roles
- `GET /[id]` — detail with user/role counts
- `PATCH /[id]` — update name, plan, config, domain
- `POST /[id]/suspend` — suspend or reactivate

**Settings** (`/api/settings`):
- `GET /users` — tenant-scoped user list (paginated, searchable)
- `POST /users/invite` — create pending user with assigned role
- `GET /roles` — tenant-scoped role list
- `POST /roles` — create custom role with permissions
- `PATCH /roles/[id]` — update (blocks system roles)

### UI / App Shell Changes

- **Root layout** — added `ThemeProvider` (dark default, system-aware)
- **Platform layout** — refactored with `@adwyzors/ui` components: Avatar + DropdownMenu for user menu, Badge for role, Link-based nav with lucide icons
- **Dashboard** — Card components for KPI placeholders
- **Super-admin layout** — same refactor (destructive color scheme for admin distinction)
- **Tenants list page** — Table component, status badges, user counts, Create Tenant button
- **Tenant detail page** — Cards for stats, recent users list, raw config viewer

### Tests (43 total)

- `packages/audit` (10) — writeAuditLog DB writes, non-blocking on failure, withAudit lifecycle
- `packages/auth` (7) — getUserPermissions chain resolution, SUPER_ADMIN bypass, dedup, skip inactive
- `apps/web` (26) — password reset validation rules, token lifecycle, tenant DTO schemas

### Key Files Added/Modified

```
packages/ui/                          ← NEW: entire package
packages/audit/                       ← NEW: entire package
packages/auth/src/permissions.ts      ← NEW: getUserPermissions
packages/database/prisma/schema.prisma ← MODIFIED: PasswordResetToken model
packages/database/src/tenant-client.ts ← MODIFIED: added PasswordResetToken to TENANT_SCOPED_MODELS
apps/web/src/app/(auth)/forgot-password/ ← NEW: page, form, actions
apps/web/src/app/(auth)/reset-password/  ← NEW: page, form, actions
apps/web/src/app/api/super-admin/tenants/ ← NEW: all route handlers + DTOs
apps/web/src/app/api/settings/           ← NEW: users + roles route handlers + DTOs
apps/web/src/app/(platform)/layout.tsx    ← REWRITTEN: uses UI components
apps/web/src/app/(super-admin)/           ← REWRITTEN: uses UI components + detail page
apps/web/src/app/layout.tsx               ← MODIFIED: ThemeProvider added
tooling/typescript/react.json             ← NEW: tsconfig preset for React packages
```

### How to Verify Locally

```bash
pnpm install
docker-compose up -d
pnpm --filter @adwyzors/database db:migrate
pnpm --filter @adwyzors/database db:seed
pnpm typecheck   # 13/13 packages
pnpm lint        # 0 errors
pnpm test        # 43 tests pass
pnpm build       # all compile
```

---

## Phase 2 — Background Jobs, Notifications & Email

**Completed**: 2026-07-08  
**Scope**: Real email delivery, in-app notifications, PDF generation, import/export pipelines, queue infrastructure

---

### New Packages

| Package | Purpose |
|---------|---------|
| `packages/email` | Email provider abstraction (Resend for prod, console logger for dev), `sendEmail()` factory, HTML email templates |
| `packages/queue` | Shared BullMQ queue definitions + typed enqueue helpers (`enqueueEmail`, `enqueuePdf`, `enqueueImport`, `enqueueExport`) |
| `packages/notifications` | In-app notification engine (create, list with cursor pagination, markRead, markAllRead, getCounts) |

### New Database Model

- **`Notification`** — in-app notifications with tenant/user scoping, read/unread state, deep links
- Migration: `20260708173208_add_notification_model`

### Email System

- **Providers**: `ResendEmailProvider` (production), `ConsoleEmailProvider` (dev — logs to terminal)
- **Templates**: `buildWelcomeEmail`, `buildPasswordResetEmail`, `buildInvoiceEmail`, `buildPaymentReminderEmail`
- **Shared layout**: HTML wrapper with header/footer, consistent styling
- **Config**: `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM` added to env schema

### Workers (services/worker)

| Worker | Function |
|--------|----------|
| Email | Template-based dispatch → builds HTML from templates → sends via configured provider |
| PDF | Generates HTML documents (ready for Puppeteer/Playwright swap) |
| Import | CSV parsing stub with progress tracking |
| Export | CSV/XLSX generation stub with progress tracking |

All workers use `@adwyzors/queue` connection. Worker index starts 4 workers.

### API Routes

- `GET /api/notifications` — list with cursor pagination, unreadOnly filter, unread/total counts
- `POST /api/notifications` — mark all as read (`{ action: "markAllRead" }`)
- `PATCH /api/notifications/[id]/read` — mark single notification as read

### UI Changes

- Notification bell icon in platform layout header with unread count badge (red, capped at 99+)
- Forgot-password action now enqueues email job via BullMQ instead of just logging

### Tests (30 new, 73 total)

- `packages/email` (19) — template output validation (to, subject, HTML content, plain text, URLs, amounts, colors)
- `packages/notifications` (11) — engine CRUD operations, cursor pagination, error handling

### Key Files Added/Modified

```
packages/email/                        ← NEW: entire package
packages/queue/                        ← NEW: entire package  
packages/notifications/                ← NEW: entire package
packages/config/src/email.ts           ← NEW: email config
packages/config/src/env.ts             ← MODIFIED: added EMAIL_PROVIDER, RESEND_API_KEY, EMAIL_FROM
packages/database/prisma/schema.prisma ← MODIFIED: Notification model
services/worker/src/workers/           ← REWRITTEN: email, pdf, import, export workers
services/worker/src/index.ts           ← MODIFIED: starts 4 workers
apps/web/src/app/(auth)/forgot-password/actions.ts ← MODIFIED: enqueues email job
apps/web/src/app/(platform)/layout.tsx ← MODIFIED: notification bell
apps/web/src/app/api/notifications/    ← NEW: notification API routes
```

### How to Verify Locally

```bash
pnpm install
docker-compose up -d
pnpm --filter @adwyzors/database db:migrate
pnpm typecheck   # 16/16 packages
pnpm lint        # 0 errors
pnpm test        # 73 tests pass
pnpm build       # all compile

# Test email flow (dev mode — logs to terminal):
# 1. Start worker: pnpm --filter @adwyzors/worker dev
# 2. Trigger forgot-password → watch terminal for email log
```

---

## Phase 3 — CRM & Customer Management

**Completed**: 2026-07-08  
**Scope**: Customer/Contact data models, CRUD APIs, list/detail pages, search/filter, GSTIN/PAN validation

---

### New Database Models

- **`Customer`** — code (auto-generated), name, type (individual/business), email, phone, address (JSON), GSTIN, PAN, credit limit, payment terms, status. Unique constraint on (tenantId, code).
- **`Contact`** — name, email, phone, role, isPrimary flag. Belongs to Customer. Cascade delete.
- Migration: `add_customer_contact_models`

### Permission Keys (8 new)

`crm.customer.list`, `crm.customer.create`, `crm.customer.view`, `crm.customer.edit`, `crm.customer.delete`, `crm.contact.list`, `crm.contact.create`, `crm.contact.edit`

### API Routes

**Customers** (`/api/crm/customers`):
- `GET /` — paginated list, search (name/code/email/phone), filter (status, type), sortable
- `POST /` — create with auto-generated code (C-0001), GSTIN/PAN format validation
- `GET /[id]` — detail with contacts included
- `PATCH /[id]` — update with version increment
- `DELETE /[id]` — soft-delete (sets deletedAt)

**Contacts** (`/api/crm/customers/[id]/contacts`):
- `GET /` — list contacts for customer (primary first)
- `POST /` — create contact (auto-unsets other primaries if isPrimary)
- `PATCH /[contactId]` — update contact

### UI Pages

- **`/customers`** — data table with code, name, type, email, phone, contact count, status. Pagination. "Add Customer" button.
- **`/customers/[id]`** — detail view with info cards (contact, business, address), contacts list with primary badge.
- **Sidebar** — "Customers" nav item with Users icon added to platform layout.

### Tests (20 new, 93 total across project)

- Customer DTO validation: name, type enum, GSTIN regex, PAN regex, address, creditLimit, paymentTerms, email format, partial updates, nullable fields

### Key Files Added

```
packages/database/prisma/schema.prisma     ← MODIFIED: Customer + Contact models
packages/permissions/src/keys.ts           ← MODIFIED: added CRM permissions
packages/database/prisma/seed.ts           ← MODIFIED: CRM permissions seeded
apps/web/src/app/api/crm/customers/        ← NEW: CRUD routes + DTOs
apps/web/src/app/api/crm/customers/[id]/contacts/ ← NEW: Contact routes + DTOs
apps/web/src/app/(platform)/customers/     ← NEW: list + detail pages
apps/web/src/app/(platform)/layout.tsx     ← MODIFIED: Customers nav link
```

---
