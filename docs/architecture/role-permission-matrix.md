# Master Role–Permission Matrix

This document defines the authoritative Role-Based Access Control (RBAC) matrix for the Real Estate CRM and Property Management Platform, covering all **seven baseline roles** and all **32 core modules** specified in Section 4 and Section 49 of `Real_Estate_CRM_Functional_Implementation_Specification_without_Delivery_Timeline.pdf`.

---

## 1. Permission System Taxonomy

The platform models permissions across **eight distinct actions** with strict least-privilege semantics:

1. **View (`view`)**: Read-only access to view records and listings. Does **not** grant edit, export, or administrative authority.
2. **Create (`create`)**: Authority to originate new records or drafts.
3. **Edit (`edit`)**: Authority to mutate existing non-published records within the user's visibility scope. Does **not** grant publish or approve authority.
4. **Delete (`delete`)**: Authority to delete or archive records.
5. **Export (`export`)**: Authority to download CSV, Excel, or PDF reports/records. Viewing a screen does **not** grant export rights.
6. **Assign (`assign`)**: Authority to route or assign/reassign leads, enquiries, or tasks to staff members.
7. **Publish (`publish`)**: Authority to transition verified/approved records to the public website catalog or live status.
8. **Approve (`approve`)**: Authority to verify, review, and approve items within controlled workflows.

### Access Legend

- **Allowed (`[A]`)**: Unrestricted within role permissions.
- **Restricted (`[R]`)**: Permitted only within the user's assigned visibility scope (`assigned` or `team`).
- **Denied by Default (`[-]`)**: Operation is explicitly blocked.
- **Not Applicable (`[N/A]`)**: The action does not exist or make sense for this module (e.g. "Assign" on System Settings).
- **Recommendation (`*`)**: Recommended least-privilege default where the specification leaves module-specific action granularity unstated.

---

## 2. Seven Baseline Roles & Responsibilities

| Role Identifier | Role Name | Documented Access | Default Lead Scope | Primary Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| `super_admin` | **Super Admin** | Full system access | Company-wide (`company`) | Complete platform governance, user provisioning, security, system settings, and audit oversight. |
| `admin` | **Admin** | Operational access | Company-wide (`company`) | Operational administration across inventory, pipelines, staff, and day-to-day business modules. |
| `sales_manager` | **Sales Manager** | Team leads, properties, follow-ups, site visits, pipelines, reports | Team-scoped (`team`) | Supervise sales teams, assign leads, monitor site visits, review pipeline velocity, and team reports. |
| `sales_executive` | **Sales Executive** | Assigned leads, properties, follow-ups, site visits, communication | Assigned-scoped (`assigned`) | Execute assigned customer engagements, schedule visits, update follow-ups, and progress deals. |
| `property_manager` | **Property Manager** | Property inventory, owners, tenants, lease information | Assigned (`assigned`) | Manage property listings, leases, tenant records, and perform operational verification. |
| `website_manager` | **Website Manager** | Website CMS, properties, projects, media, blog, SEO | Assigned (`assigned`) | Author website content, curate media, and prepare property/project listings for web publishing. |
| `management_viewer` | **Management / Viewer** | Dashboard and reports | Company-wide (`company`) | Executive review of performance dashboards, financial summaries, and read-only reports. |

---

## 3. Comprehensive Module Permission Matrix

### 3.1 Core Operations & Administration

| Module | Action | Super Admin | Admin | Sales Mgr | Sales Exec | Property Mgr | Website Mgr | Viewer | Source / Rationale |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Dashboard** | View | [A] | [A] | [A] | [A] | [A] | [A] | [A] | Documented Section 49 |
| | Export | [A] | [A] | [-] | [-] | [-] | [-] | [-] | Recommendation (Least Privilege) |
| **Staff / Users** | View | [A] | [A] | [-] | [-] | [-] | [-] | [-] | Documented Section 48 |
| | Create / Edit | [A] | [A] | [-] | [-] | [-] | [-] | [-] | Documented Section 48 |
| | Delete / Deactivate | [A] | [A] | [-] | [-] | [-] | [-] | [-] | Documented Section 48 |
| | Export | [A] | [A] | [-] | [-] | [-] | [-] | [-] | Administrative privilege |
| **Roles & Permissions** | View | [A] | [A] | [-] | [-] | [-] | [-] | [-] | Documented Section 49 |
| | Edit | [A] | [-]* | [-] | [-] | [-] | [-] | [-] | Super Admin only to prevent privilege escalation |
| **Audit Logs** | View | [A] | [A] | [-] | [-] | [-] | [-] | [-] | Documented Section 58 |
| | Export | [A] | [A] | [-] | [-] | [-] | [-] | [-] | Compliance oversight |
| **Master Settings** | View / Edit | [A] | [A] | [-] | [-] | [-] | [-] | [-] | Section 86 |
| **System Settings** | View | [A] | [A] | [-] | [-] | [-] | [-] | [-] | Core system parameters |
| | Edit | [A] | [-]* | [-] | [-] | [-] | [-] | [-] | Super Admin restricted (system stability) |

---

### 3.2 Sales & Customer Relationship Management

| Module | Action | Super Admin | Admin | Sales Mgr | Sales Exec | Property Mgr | Website Mgr | Viewer | Source / Rationale |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Leads** | Scope | Company | Company | Team | Assigned | Assigned | Assigned | Company | Documented Section 50 |
| | View | [A] | [A] | [R] | [R] | [-] | [-] | [-] | Documented Section 49 |
| | Create / Edit | [A] | [A] | [R] | [R] | [-] | [-] | [-] | Operational sales workflow |
| | Delete | [A] | [A] | [-] | [-] | [-] | [-] | [-] | Prevent accidental record deletion |
| | Export | [A] | [A] | [R] | [-] | [-] | [-] | [-] | Sales Manager export; Exec restricted |
| | Assign | [A] | [A] | [R] | [-] | [-] | [-] | [-] | Reassignment authority |
| | Approve | [A] | [A] | [A] | [-] | [-] | [-] | [-] | Lead qualification signoff |
| **Enquiries** | View | [A] | [A] | [R] | [R] | [-] | [-] | [-] | Documented Section 4 |
| | Create / Edit | [A] | [A] | [R] | [R] | [-] | [-] | [-] | Lead conversion |
| | Assign | [A] | [A] | [R] | [-] | [-] | [-] | [-] | Sales Manager routing |
| **Clients** | View | [A] | [A] | [R] | [R] | [-] | [-] | [-] | Documented Section 4 |
| | Create / Edit | [A] | [A] | [R] | [R] | [-] | [-] | [-] | Client profile records |
| | Export | [A] | [A] | [R] | [-] | [-] | [-] | [-] | Client data protection |
| **Follow-ups** | View / Edit | [A] | [A] | [R] | [R] | [-] | [-] | [-] | Documented Section 49 |
| **Site Visits** | View / Edit | [A] | [A] | [R] | [R] | [-] | [-] | [-] | Documented Section 49 |
| | Approve | [A] | [A] | [A] | [-] | [-] | [-] | [-] | Site visit outcome verification |
| **Sales Pipeline** | View | [A] | [A] | [A] | [R] | [-] | [-] | [A] | Documented Section 49 |
| | Edit / Move Stage | [A] | [A] | [A] | [R] | [-] | [-] | [-] | Deal progression |
| **Bookings** | View / Create | [A] | [A] | [A] | [-] | [-] | [-] | [-] | Section 4 (Financial transaction) |

---

### 3.3 Property Inventory & Asset Management

| Module | Action | Super Admin | Admin | Sales Mgr | Sales Exec | Property Mgr | Website Mgr | Viewer | Source / Rationale |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Properties** | View | [A] | [A] | [A] | [A] | [A] | [A] | [A] | Documented Section 49 |
| | Create / Edit | [A] | [A] | [-] | [-] | [A] | [A]* | [-] | Inventory governance |
| | Delete | [A] | [A] | [-] | [-] | [A] | [-] | [-] | Restricted to Inventory Admins |
| | Export | [A] | [A] | [-] | [-] | [A] | [-] | [-] | Inventory brochures & sheets |
| | Approve | [A] | [A] | [-] | [-] | [A] | [-] | [-] | Section 51 Verification |
| | Publish | [A] | [A] | [-] | [-] | [-]* | [A]* | [-] | Section 51 Controlled publication |
| **Residential Properties** | Same as Properties | [A] | [A] | View | View | [A] | Edit | View | Sub-type inheritance |
| **Commercial Properties** | Same as Properties | [A] | [A] | View | View | [A] | Edit | View | Sub-type inheritance |
| **Plots / Land** | Same as Properties | [A] | [A] | View | View | [A] | Edit | View | Sub-type inheritance |
| **Rental / Leasing** | View / Edit | [A] | [A] | [-] | [-] | [A] | [-] | [-] | Documented Section 49 (Property Mgr) |
| **Owners** | View / Edit | [A] | [A] | [-] | [-] | [A] | [-] | [-] | Documented Section 49 |
| **Projects** | View | [A] | [A] | [A] | [A] | [A] | [A] | [A] | Documented Section 4 |
| | Create / Edit | [A] | [A] | [-] | [-] | [A] | [A] | [-] | Project management |
| | Approve | [A] | [A] | [-] | [-] | [A] | [-] | [-] | Section 51 Review & Approval |
| | Publish | [A] | [A] | [-] | [-] | [-] | [A]* | [-] | Public catalog publishing |

---

### 3.4 Website CMS & Communications

| Module | Action | Super Admin | Admin | Sales Mgr | Sales Exec | Property Mgr | Website Mgr | Viewer | Source / Rationale |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Website CMS** | View / Edit | [A] | [A] | [-] | [-] | [-] | [A] | [-] | Documented Section 49 |
| | Publish | [A] | [A] | [-] | [-] | [-] | [A] | [-] | Section 51 Website CMS Workflow |
| **Media Library** | View / Upload | [A] | [A] | [-] | [-] | [A] | [A] | [-] | Asset curation |
| **Communications** | View / Send | [A] | [A] | [A] | [A] | [-] | [-] | [-] | Email, WhatsApp logging |
| **Reports** | View | [A] | [A] | [A] | [-] | [-] | [-] | [A] | Documented Section 49 |
| | Export | [A] | [A] | [A] | [-] | [-] | [-] | [A]* | Business decision on viewer export |

---

## 4. Key Security Rules & Decisions Documented

1. **Separation of Admin vs Super Admin**:
   - `super_admin`: Retains sole authority to edit role permissions, modify system configurations, and manage sensitive security policies.
   - `admin`: Operates the business day-to-day (staff, properties, leads, pipelines) without the ability to strip permissions or lock out the system owner.
2. **Website Manager Publishing Constraint**:
   - Even though the Website Manager creates and edits web content, property publishing requires the property to pass through verification (`draft` -> `verification` -> `approved`) before public deployment.
3. **Sales Executive Scope Isolation**:
   - Sales Executives are strictly restricted to `assigned` leads. Query tampering or attempting to view unauthorized IDs fails closed.
4. **Viewer Record Immutability**:
   - Management / Viewer has read-only access to Dashboards and Reports. Zero mutation operations (`create`, `edit`, `delete`, `publish`, `assign`, `approve`) are permitted.
