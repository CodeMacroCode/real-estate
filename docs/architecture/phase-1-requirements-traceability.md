# Phase 1 Requirements Traceability Matrix

This document maps all business and technical requirements from the source specification (`Real_Estate_CRM_Functional_Implementation_Specification_without_Delivery_Timeline.pdf`) applicable to **Phase 1** to their exact implementation locations, automated tests, and verification status, including the Phase 1 Security & Defect Remediation Audit.

---

## 1. Specification Traceability Table

| Source Section | Requirement Description | Implementation Location | Associated Tests | Status | Notes / Decisions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Section 2 & 3** | Single source of truth architecture; server-side database access via MongoDB and Mongoose | `src/lib/mongodb/db.ts` | `tests/integration/db-seeding.test.ts` | **Implemented and verified** | Mongoose connection caching implemented for Next.js App Router. MongoDB is authoritative store. |
| **Section 4** | Admin Panel Module structure (32 modules) | `src/types/index.ts`<br>`src/components/layout/Sidebar.tsx` | `tests/unit/roles.test.ts` | **Implemented and verified** | All 32 modules modeled in types and matrix. Phase 1 modules active; later-phase modules clearly badged. |
| **Section 48** | Staff / User Management — 12 specified fields: Employee ID, Name, Email, Mobile, Department, Role, Designation, Branch, Profile Photo, Joining Date, Status, Login Status | `src/models/User.ts`<br>`src/services/userService.ts`<br>`src/app/(dashboard)/users/page.tsx` | `tests/unit/user-validation.test.ts`<br>`tests/integration/user-service.test.ts` | **Implemented and verified** | All 12 fields persisted with validation, uniqueness checks on Employee ID and Email, and secure status management. |
| **Section 48** | Account activation and deactivation | `src/services/userService.ts`<br>`src/app/api/users/[id]/status/route.ts` | `tests/integration/user-service.test.ts`<br>`tests/integration/auth-api.test.ts`<br>`tests/integration/api-handlers.test.ts` | **Implemented and verified** | Deactivated users are rejected immediately on authenticated requests. Historical records preserved. |
| **Section 49** | Role-Based Access Control — 7 Baseline Roles (Super Admin, Admin, Sales Mgr, Sales Exec, Property Mgr, Website Mgr, Viewer) | `src/policies/baselineRoles.ts`<br>`scripts/seed-roles.ts`<br>`src/models/Role.ts` | `tests/unit/roles.test.ts`<br>`tests/integration/db-seeding.test.ts` | **Implemented and verified** | All 7 roles seeded with idempotent script into MongoDB. Stable slugs used. |
| **Section 49** | 8 Permission Actions: View, Create, Edit, Delete, Export, Assign, Publish, Approve | `src/types/index.ts`<br>`src/policies/permissionPolicy.ts` | `tests/unit/permissions.test.ts`<br>`tests/integration/api-handlers.test.ts` | **Implemented and verified** | Fail-closed RBAC engine without slug bypass. View != Edit; Edit != Publish; View != Export. |
| **Section 50** | Lead Visibility: Assigned, Team, Company scopes | `src/policies/leadVisibilityPolicy.ts` | `tests/unit/lead-visibility.test.ts` | **Implemented and verified** | Enforced at server query level. Tampering with IDs rejected. |
| **Section 51** | Controlled Publication Workflows: Property (Draft->Verification->Approved->Published), Project, Website Content | `src/policies/workflowPolicy.ts` | `tests/unit/workflow.test.ts` | **Implemented and verified** | State machine policies require specific permissions (`approve`, `publish`) for transitions. |
| **Section 58** | Security & Compliance Audit Log: Actor, Action, Entity, Entity ID, Old/New values, Timestamp, Source | `src/models/AuditLog.ts`<br>`src/services/auditService.ts`<br>`src/app/(dashboard)/audit-logs/page.tsx` | `tests/unit/audit.test.ts`<br>`tests/integration/audit-persistence.test.ts` | **Implemented and verified** | Passwords, tokens, and secrets are automatically redacted before database write. |
| **Section 59** | Login & Security: Password hashing (bcrypt), session tokens (JWT), HTTP-only cookies, rate limiting considerations | `src/lib/auth/`<br>`src/middleware.ts`<br>`src/app/(auth)/login/page.tsx` | `tests/unit/authentication.test.ts`<br>`tests/integration/auth-api.test.ts`<br>`tests/integration/api-handlers.test.ts` | **Implemented and verified** | Passwords hashed with 12 salt rounds; JWT signed via `jose`; rate limiting; CSRF checks; HttpOnly session cookies. |
| **Section 60** | REST API Architecture for auth, users, roles, audit logs | `src/app/api/auth/`<br>`src/app/api/users/`<br>`src/app/api/roles/`<br>`src/app/api/audit-logs/` | `tests/integration/user-service.test.ts`<br>`tests/integration/auth-api.test.ts`<br>`tests/integration/api-handlers.test.ts` | **Implemented and verified** | Standardized JSON envelopes, Zod validation, proper HTTP status codes. |
| **Section 86** | Initial Super Admin Bootstrap CLI | `scripts/bootstrap-admin.ts` | `tests/integration/db-seeding.test.ts` | **Implemented and verified** | Provisioned via CLI environment variables without public bypass endpoints or logged secrets. |

---

## 2. Phase 1 Security Defect Remediation & Hardening Audit

The table below tracks the status of all eight confirmed security and architectural defects audited in Phase 1:

| Priority | Defect Description | Remediation Implemented | Verification Tests | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Priority 1** | JWT Secret fallback & boundary validation | Removed hardcoded fallback secret from `src/lib/auth/jwt.ts`. Fails safely if `AUTH_SECRET` is missing or < 32 chars. Updated `.env.example` and `README.md`. | `tests/unit/authentication.test.ts` | **Fixed & Verified** |
| **Priority 2** | Super Admin authorization bypass | Removed unconditional `role.slug === 'super_admin'` bypass from `src/policies/permissionPolicy.ts`. Enforced strict fail-closed evaluation requiring explicit permission grants on all modules. Protected system role from accidental lockout. | `tests/unit/permissions.test.ts`<br>`tests/integration/api-handlers.test.ts` | **Fixed & Verified** |
| **Priority 3** | Role-management authorization | Required authorized administrative principal (`super_admin`) or distinct permission (`system_settings: edit`) in `PUT /api/roles/[id]` and `roleService.ts`. Blocked self-escalation, arbitrary assignment of higher privileges, and modification of system role permissions. | `tests/unit/session-roles.test.ts`<br>`tests/integration/api-handlers.test.ts` | **Fixed & Verified** |
| **Priority 4** | User role assignment privilege separation | Separated ordinary staff field editing from privileged role assignment in `src/app/api/users/[id]/route.ts` and `src/app/api/users/route.ts`. Validated assigned roles against actor authority (`staff_users: assign`), blocked self-escalation, and restricted `super_admin` assignment exclusively to Super Admins. | `tests/integration/api-handlers.test.ts` | **Fixed & Verified** |
| **Priority 5** | Hardcoded Development Credentials in UI | Removed hardcoded Quick Fill Super Admin credentials and helper component from `src/app/(auth)/login/page.tsx`, eliminating credential leaks in frontend JavaScript bundles. | `npm run build`<br>`src/app/(auth)/login/page.tsx` inspection | **Fixed & Verified** |
| **Priority 6** | Authentication, Sessions, CSRF & Rate Limiting | Protected APIs validate active user & authoritative role from database on every request. Removed JWT from login JSON response body. Implemented sliding-window rate limiting (5 attempts/15m with 429 response). Added session revocation tracking (`lastLogoutAt`) and CSRF Origin/Referer/Fetch Metadata checks. | `tests/integration/auth-api.test.ts`<br>`tests/integration/api-handlers.test.ts` | **Fixed & Verified** |
| **Priority 7** | Seed Safety & Admin Customization Preservation | Modified `scripts/seed-roles.ts` to separate initial creation from deliberate migration. Repeat seeds default to `overwritePermissions: false` to preserve admin-customized permissions and scopes. Deliberate reset supported via explicit flag (`--force`). | `tests/integration/db-seeding.test.ts` | **Fixed & Verified** |
| **Priority 8** | Real API Integration Test Coverage | Added `tests/integration/api-handlers.test.ts` exercising real Next.js route handlers with database isolation for login, user CRUD, role modification, inactive sessions, session revocation, and CSRF protection across both success and rejection paths. | `tests/integration/api-handlers.test.ts`<br>`tests/integration/auth-api.test.ts` | **Fixed & Verified** |

---

## 3. Requirements Explicitly Deferred to Subsequent Phases (Unresolved / Future Scope)

In accordance with Phase 1 scope boundaries, the following modules are defined in the schema and RBAC matrix but deferred for implementation in subsequent phases. There are **zero unresolved defects** within Phase 1 scope:

- Full Property Inventory CRUD and Search (Residential, Commercial, Land, Investments) — **Phase 2 (Deferred as planned)**
- Full Lead Ingestion & Qualification Pipeline — **Phase 2 (Deferred as planned)**
- Client & Owner Portals — **Phase 3 (Deferred as planned)**
- Site Visit Tracking & Booking / Commission Calculations — **Phase 3 (Deferred as planned)**
- Website CMS Public Consumer API & Webhook Synchronization — **Phase 4 (Deferred as planned)**
