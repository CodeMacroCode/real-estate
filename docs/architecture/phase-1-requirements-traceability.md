# Phase 1 Requirements Traceability Matrix

This document maps all business and technical requirements from the source specification (`Real_Estate_CRM_Functional_Implementation_Specification_without_Delivery_Timeline.pdf`) applicable to **Phase 1** to their exact implementation locations, automated tests, and verification status.

---

## 1. Traceability Table

| Source Section | Requirement Description | Implementation Location | Associated Tests | Status | Notes / Decisions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Section 2 & 3** | Single source of truth architecture; server-side database access via MongoDB and Mongoose | `src/lib/mongodb/db.ts` | `tests/integration/db-seeding.test.ts` | **Implemented and verified** | Mongoose connection caching implemented for Next.js App Router. MongoDB is authoritative store. |
| **Section 4** | Admin Panel Module structure (32 modules) | `src/types/index.ts`<br>`src/components/layout/Sidebar.tsx` | `tests/unit/roles.test.ts` | **Implemented and verified** | All 32 modules modeled in types and matrix. Phase 1 modules active; later-phase modules clearly badged. |
| **Section 48** | Staff / User Management — 12 specified fields: Employee ID, Name, Email, Mobile, Department, Role, Designation, Branch, Profile Photo, Joining Date, Status, Login Status | `src/models/User.ts`<br>`src/services/userService.ts`<br>`src/app/(dashboard)/users/page.tsx` | `tests/unit/user-validation.test.ts`<br>`tests/integration/user-service.test.ts` | **Implemented and verified** | All 12 fields persisted with validation, uniqueness checks on Employee ID and Email, and secure status management. |
| **Section 48** | Account activation and deactivation | `src/services/userService.ts`<br>`src/app/api/users/[id]/status/route.ts` | `tests/integration/user-service.test.ts`<br>`tests/integration/auth-api.test.ts` | **Implemented and verified** | Deactivated users are rejected immediately on authenticated requests. Historical records preserved. |
| **Section 49** | Role-Based Access Control — 7 Baseline Roles (Super Admin, Admin, Sales Mgr, Sales Exec, Property Mgr, Website Mgr, Viewer) | `src/policies/baselineRoles.ts`<br>`scripts/seed-roles.ts`<br>`src/models/Role.ts` | `tests/unit/roles.test.ts`<br>`tests/integration/db-seeding.test.ts` | **Implemented and verified** | All 7 roles seeded with idempotent script into MongoDB. Stable slugs used. |
| **Section 49** | 8 Permission Actions: View, Create, Edit, Delete, Export, Assign, Publish, Approve | `src/types/index.ts`<br>`src/policies/permissionPolicy.ts` | `tests/unit/permissions.test.ts` | **Implemented and verified** | Fail-closed RBAC engine. View != Edit; Edit != Publish; View != Export. |
| **Section 50** | Lead Visibility: Assigned, Team, Company scopes | `src/policies/leadVisibilityPolicy.ts` | `tests/unit/lead-visibility.test.ts` | **Implemented and verified** | Enforced at server query level. Tampering with IDs rejected. |
| **Section 51** | Controlled Publication Workflows: Property (Draft->Verification->Approved->Published), Project, Website Content | `src/policies/workflowPolicy.ts` | `tests/unit/workflow.test.ts` | **Implemented and verified** | State machine policies require specific permissions (`approve`, `publish`) for transitions. |
| **Section 58** | Security & Compliance Audit Log: Actor, Action, Entity, Entity ID, Old/New values, Timestamp, Source | `src/models/AuditLog.ts`<br>`src/services/auditService.ts`<br>`src/app/(dashboard)/audit-logs/page.tsx` | `tests/unit/audit.test.ts`<br>`tests/integration/audit-persistence.test.ts` | **Implemented and verified** | Passwords, tokens, and secrets are automatically redacted before database write. |
| **Section 59** | Login & Security: Password hashing (bcrypt), session tokens (JWT), HTTP-only cookies, rate limiting considerations | `src/lib/auth/`<br>`src/middleware.ts`<br>`src/app/(auth)/login/page.tsx` | `tests/unit/authentication.test.ts`<br>`tests/integration/auth-api.test.ts` | **Implemented and verified** | Passwords hashed with 12 salt rounds; JWT signed via `jose`; protected route middleware. |
| **Section 60** | REST API Architecture for auth, users, roles, audit logs | `src/app/api/auth/`<br>`src/app/api/users/`<br>`src/app/api/roles/`<br>`src/app/api/audit-logs/` | `tests/integration/user-service.test.ts`<br>`tests/integration/auth-api.test.ts` | **Implemented and verified** | Standardized JSON envelopes, Zod validation, proper HTTP status codes. |
| **Section 86** | Initial Super Admin Bootstrap CLI | `scripts/bootstrap-admin.ts` | `tests/integration/db-seeding.test.ts` | **Implemented and verified** | Provisioned via CLI environment variables without public bypass endpoints or logged secrets. |

---

## 2. Requirements Explicitly Deferred to Subsequent Phases

In accordance with Phase 1 scope boundaries, the following modules are defined in the schema and RBAC matrix but deferred for implementation in subsequent phases:

- Full Property Inventory CRUD and Search (Residential, Commercial, Land, Investments) — **Phase 2**
- Full Lead Ingestion & Qualification Pipeline — **Phase 2**
- Client & Owner Portals — **Phase 3**
- Site Visit Tracking & Booking / Commission Calculations — **Phase 3**
- Website CMS Public Consumer API & Webhook Synchronization — **Phase 4**
