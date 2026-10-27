# Real Estate CRM & Property Admin Platform — Phase 1

An enterprise-grade Real Estate CRM, Property Management, and Website Administration Platform built from scratch with Next.js (App Router), TypeScript, MongoDB, and Mongoose.

This repository implements **Phase 1: Project Foundation, Authentication, Staff & User Management, Roles & Permissions, and Access Control** in strict alignment with the business requirements specification (`Real_Estate_CRM_Functional_Implementation_Specification_without_Delivery_Timeline.pdf`).

---

## 1. Technology Stack & Package Versions

- **Framework**: Next.js 14.2.35 (React 18.3.1, App Router, Server/Client components, Route Handlers)
- **Language**: TypeScript 5.6.3 (Strict mode enabled)
- **Database**: MongoDB 8.x
- **ODM**: Mongoose 8.7.2 (Schema validations, unique compound indexing, schema-level transforms)
- **Authentication**: JWT via `jose` (stateless, tamper-proof, HTTP-only, SameSite cookies) + `bcryptjs` (salt rounds: 12)
- **Validation**: Zod 3.23.8 at all API/server boundaries
- **Styling**: Tailwind CSS 3.4.14 with Lucide React 0.453.0 icons
- **Testing**: Vitest 2.1.9, `@vitest/coverage-v8`, `@testing-library/react` 16.0.1, `@testing-library/jest-dom` 6.6.2

---

## 2. Architecture & File Structure

```text
real-estate/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx               # Administrative sign-in interface
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                   # Authenticated App Shell (Sidebar, Header)
│   │   │   ├── dashboard/page.tsx           # Phase 1 executive metrics & module status
│   │   │   ├── users/page.tsx               # Section 48 Staff directory, create/edit, status toggle
│   │   │   ├── roles/page.tsx               # Section 49 Roles & 8-action permissions matrix
│   │   │   └── audit-logs/page.tsx          # Section 58 Audit trail & payload diff inspector
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts           # Login, JWT issue, HTTP-only cookie, audit log
│   │       │   ├── logout/route.ts          # Session termination, cookie clear, audit log
│   │       │   └── me/route.ts              # Session validation & permission retrieval
│   │       ├── users/
│   │       │   ├── route.ts                 # List staff (filters, search, pagination), Create staff
│   │       │   └── [id]/
│   │       │       ├── route.ts             # Get user by ID, Update user
│   │       │       └── status/route.ts      # Activate/Deactivate staff account
│   │       ├── roles/
│   │       │   ├── route.ts                 # List 7 baseline roles & permissions
│   │       │   └── [id]/route.ts            # Get & update role permissions/scopes
│   │       └── audit-logs/route.ts          # Query immutable audit records
│   ├── components/
│   │   ├── layout/                          # Header, Sidebar, Navigation
│   │   └── ui/                              # Badge, Modal, Alert, Spinner, EmptyState
│   ├── lib/
│   │   ├── mongodb/db.ts                    # Global cached Mongoose connection pool
│   │   ├── auth/                            # Passwords, JWT, session cookies
│   │   └── validation/schemas.ts            # Zod validation schemas
│   ├── models/
│   │   ├── Role.ts                          # Role schema with 8 permission actions & scopes
│   │   ├── User.ts                          # 12 Section 48 staff fields + security fields
│   │   └── AuditLog.ts                      # Section 58 audit model with old/new values
│   ├── policies/
│   │   ├── baselineRoles.ts                 # 7 Baseline roles specification
│   │   ├── permissionPolicy.ts              # Fail-closed RBAC engine (8 actions)
│   │   ├── leadVisibilityPolicy.ts          # Section 50 3-tier lead visibility policy
│   │   └── workflowPolicy.ts                # Section 51 Controlled publication state machines
│   ├── services/
│   │   ├── userService.ts                   # Staff lifecycle, uniqueness, deactivation
│   │   ├── roleService.ts                   # Role permission modifications & protection
│   │   └── auditService.ts                  # Audit logging & sensitive data redaction
│   ├── types/index.ts                       # Domain types, interfaces, enums
│   └── middleware.ts                        # Edge-compatible route guard & redirect engine
├── scripts/
│   ├── seed-roles.ts                        # Idempotent baseline role seeder
│   └── bootstrap-admin.ts                   # Secure Super Admin provisioning CLI
├── tests/
│   ├── unit/                                # Roles, Permissions, Lead Visibility, Validation, Auth, Workflows, Audit, Components
│   └── integration/                         # DB Seeding, User persistence, Audit persistence, Auth API
└── docs/
    ├── architecture/                        # Traceability, Role-Permission Matrix, Access Control, Workflows, Completion Report
    └── testing/                             # Phase 1 Test Plan
```

---

## 3. Getting Started

### Prerequisites

- **Node.js**: v18.18.0 or higher (v20+ recommended)
- **MongoDB**: v6.0+ (Tested against MongoDB 8.3.4)

### Installation

```bash
# Clone the repository and install dependencies
git clone <repository_url>
cd real-estate
npm install
```

### Environment Configuration

Copy the example environment template:

```bash
cp .env.example .env
```

Ensure `.env` contains:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/real_estate_crm
AUTH_SECRET=your-minimum-32-character-secret-key-goes-here
APP_URL=http://localhost:3000
NODE_ENV=development

# Super Admin Provisioning (Used strictly by scripts/bootstrap-admin.ts)
BOOTSTRAP_SUPER_ADMIN_EMAIL=superadmin@realestatecrm.com
BOOTSTRAP_SUPER_ADMIN_PASSWORD=SuperAdmin@Secure123!
BOOTSTRAP_SUPER_ADMIN_NAME=System Super Admin
BOOTSTRAP_SUPER_ADMIN_EMP_ID=EMP001
BOOTSTRAP_SUPER_ADMIN_PHONE=+919876543210
```

---

## 4. Database Setup & Initial Provisioning

### Step 1: Start MongoDB
Ensure MongoDB is running locally:
```bash
# Verify MongoDB connection
mongod --dbpath /opt/homebrew/var/mongodb
```

### Step 2: Seed the 7 Baseline Roles
Seeds the 7 baseline roles idempotently into MongoDB:
```bash
npm run seed:roles
```

### Step 3: Bootstrap the Initial Super Admin Account
Creates the initial Super Administrator from the environment variables, securely hashes the password with bcrypt, checks uniqueness, and records an audit log:
```bash
npm run bootstrap:admin
```

---

## 5. Development & Running the Application

Start the Next.js development server:
```bash
npm run dev
```

Open your browser to:
[http://localhost:3000](http://localhost:3000)

- If unauthenticated, you will be automatically redirected to `/login`.
- You can sign in using the provisioned Super Admin credentials (or use the one-click "Quick Fill" button in development).
- Explore the **Dashboard**, **Staff & Users** directory, **Roles & Permissions Matrix**, and **Audit Logs**.

---

## 6. Verification & Automated Testing Commands

All checks pass with zero errors:

| Command | Purpose | Verification Result |
| :--- | :--- | :--- |
| `npm run typecheck` | TypeScript strict type checking | `tsc --noEmit` exited 0 (0 errors) |
| `npm run lint` | Next.js ESLint verification | `next lint` exited 0 (0 warnings, 0 errors) |
| `npm test` | Vitest Unit & Integration test suite | **13 files passed, 81 tests passed** |
| `npm run test:coverage` | V8 Coverage analysis | **>80% - 100% on critical policies** |
| `npm run test:integration` | Real database persistence tests | All DB tests passed against MongoDB |
| `npm run build` | Next.js Production Build | Optimized production build compiled cleanly |

---

## 7. Key Features Implemented in Phase 1

1. **Staff / User Management (Section 48)**:
   - Full persistence for all 12 specified fields: Employee ID, Name, Email, Mobile, Department, Role, Designation, Branch, Profile Photo, Joining Date, Status (Active/Inactive), Login Status (Online/Offline/Never Logged In).
   - Server-side unique constraints on `employeeId` and `email`.
   - Complete account deactivation lifecycle (deactivated accounts immediately lose authenticated access; historical records are strictly preserved).

2. **Role-Based Access Control (Section 49)**:
   - 7 Baseline Roles: Super Admin, Admin, Sales Manager, Sales Executive, Property Manager, Website Manager, Management / Viewer.
   - 8 Permission Actions: View, Create, Edit, Delete, Export, Assign, Publish, Approve.
   - Strict least-privilege, fail-closed authorization engine (`hasPermission`).
   - View does not imply edit; edit does not imply publish; view does not imply export.

3. **Lead Visibility Policies (Section 50)**:
   - 3 Visibility Scopes: Only assigned leads, Team leads, All company leads.
   - Enforced server-side via MongoDB query filters and parameter tampering protection.

4. **Approval & Controlled Publishing Workflows (Section 51)**:
   - Property: `draft` -> `verification` -> `approved` -> `published`.
   - Project: `draft` -> `review` -> `approved` -> `published`.
   - Website Content: `draft` -> `review` -> `published`.
   - Verifies permissions for state transitions; publishing requires explicit publication grant.

5. **Security & Compliance Audit Logging (Section 58)**:
   - Immutable audit trail capturing actor, action, entity, entity ID, old/new values, IP address, and timestamp.
   - Automatic redaction of sensitive credentials, passwords, and tokens.

---

## 8. Troubleshooting

- **MongoDB Connection Refused (`ECONNREFUSED 127.0.0.1:27017`)**:
  Verify that MongoDB daemon is running locally (`mongod` or `brew services`).
- **Session Expired / Unauthorized (401)**:
  Cookies may be blocked or expired. Re-authenticate via `/login`.
- **Duplicate Administrator Error on Bootstrap**:
  `scripts/bootstrap-admin.ts` detects existing administrators by email or employeeId to prevent accidental duplicate overwrites.

---

## 9. Phase Boundary Notice

In compliance with the project scope:
- Full Property Inventory Management, Full Lead Pipelines, Brokerage/Commission calculations, and Public Website CMS frontend are scheduled for **subsequent phases**.
- Phase 1 delivers the hardened architectural foundation, database ODM models, authentication, user administration, and access-control engines required to support those future modules.
