# AGENTS.md — Instructions for Codex and AI Coding Agents

Project: **ANVEL Contractor Portal**  
Repository: `anvel-contractor-portal`  
Owner: **ERP UTILITIES CONSULTING SERVICES LTD**  
Production domain: `portal.anvelconsulting.com`  
Notification email: `contact@anvelconsulting.com`

This file contains mandatory instructions for Codex or any AI coding assistant working in this repository.

Do not ignore this file.

---

## 1. Project identity

This project is a private internal contractor portal for ERP UTILITIES CONSULTING SERVICES LTD.

The product name is:

```text
ANVEL Contractor Portal
```

The portal is used only for freelancers/subcontractors who have already been selected and contractually accepted.

It is not:

- a public SaaS product;
- a recruitment CRM;
- a candidate database;
- a CV scoring tool;
- a client portal;
- an accounting system;
- a SAP code repository;
- a project management system.

---

## 2. Educational development mode

This project is being built as a learning project for a second-year Computer Science student.

Codex must act as a learning assistant, not as a black-box code generator.

Before implementing a task, explain:

1. what will be changed;
2. why it is needed;
3. which files are expected to be created or modified;
4. what technical concept is involved;
5. what should be understood before approving the change.

After implementing, explain:

1. what changed;
2. how the change works;
3. how to test it manually;
4. any security or privacy implications;
5. what the next safe step is.

Do not produce large unreviewed changes.

---

## 3. Approved technology stack

Use only this stack unless the owner explicitly approves a change:

- Next.js App Router;
- TypeScript;
- Tailwind CSS;
- shadcn/ui, customised and sober;
- Supabase EU;
- Supabase Auth;
- Supabase PostgreSQL;
- Supabase Storage;
- PostgreSQL Row Level Security;
- React Hook Form;
- Zod;
- GitHub;
- Vercel;
- Cloudflare.

The app language is English.

The MVP currency is EUR only.

---

## 4. Product scope

The MVP includes:

- contractor profiles;
- legal/fiscal/bank details;
- signed PDF document upload;
- project assignment;
- hourly rate per contractor/project;
- admin-only sales rate, if implemented;
- monthly timesheets;
- admin approval/rejection of timesheets;
- payment statement / invoice draft calculation;
- self-billing invoice generation from approved timesheets;
- official invoice upload by contractor;
- invoice review;
- manual payment status;
- CSV/Excel accountant export;
- audit logs for sensitive actions;
- responsive web design.

---

## 5. Explicitly out of scope

Do not implement the following unless the owner explicitly asks for them later:

- candidate sourcing;
- candidate CV database;
- AI candidate scoring;
- public contractor registration;
- client portal;
- SAP code storage;
- SAP client data storage;
- detailed task reporting;
- automatic legal invoice issuance;
- automatic bank payments;
- electronic signature integration;
- payment card handling;
- analytics/tracking scripts;
- passport/ID collection by default.

---

## 6. User roles

Use these roles:

```text
admin
operations
contractor
```

### Admin

Admin can manage all operational data.

### Operations

Operations is limited support access.

Operations must not automatically get access to full bank details, sensitive legal documents, payment approval or rate management.

### Contractor

Contractor can only access their own data.

A contractor must never be able to see another contractor's profile, documents, timesheets, invoices or payment status.

---

## 7. Timesheet business rules

Timesheets are monthly.

Contractors enter only the days actually worked.

Required fields for a timesheet entry:

- date;
- project;
- hours.

Optional:

- brief note.

Not required:

- workload agreement;
- task description;
- ticket number;
- technical activity details;
- rows for days with no work.

Business rule:

```text
If no work was performed on a day, no timesheet row is required.
```

Validation rules:

- hours cannot be negative;
- hours cannot be above 24 per day;
- show warning if hours are above 10 in a day;
- show warning if work date is weekend;
- do not allow duplicate date rows for the same timesheet;
- do not allow contractor edits after approval;
- admin can reopen a timesheet if correction is needed.

---

## 8. Invoice and payment rules

The portal calculates payable amounts from approved timesheets and generates self-billing invoices.

Contractor-uploaded invoices may remain available as an optional manual fallback.

The portal tracks invoice review and payment status manually.

Do not implement automatic bank payments.

---

## 9. VAT rules

Use these VAT treatment options in MVP:

```text
EU supplier with valid VAT number — reverse charge
Cyprus supplier — Cyprus VAT 19%
Non-EU supplier — accountant review
EU supplier without VAT number — accountant review required
```

Do not implement automatic VIES validation in MVP unless explicitly requested.

---

## 10. Data minimisation and privacy

Apply GDPR-aware data minimisation.

Do not collect data unless it is needed for the portal purpose.

Do not request passport/ID documents by default.

Do not store:

- medical data;
- biometric data;
- payment card data;
- SAP client credentials;
- SAP production data;
- client confidential project documents unless explicitly required.

Development and staging must use fake data only.

Production is the only environment where real contractor data may be used.

---

## 11. Security rules

Security is mandatory from the beginning.

Follow these rules:

- no secrets committed to Git;
- use `.env.local` for local secrets;
- use `.env.example` for placeholders;
- never expose Supabase service role keys in browser code;
- enable RLS on all business tables;
- contractors can only access their own rows;
- use private Supabase Storage buckets;
- do not create public buckets for sensitive files;
- use signed URLs or authenticated downloads for sensitive documents;
- validate file types and file sizes;
- validate forms with Zod;
- validate critical rules server-side or database-side;
- record audit logs for sensitive actions;
- avoid storing unnecessary personal data inside audit metadata.

---

## 12. Database rules

Use PostgreSQL with Supabase.

General table rules:

- use UUID primary keys;
- include `created_at` and `updated_at` where relevant;
- use foreign keys;
- use numeric/decimal types for financial values;
- store currency explicitly;
- use constrained status values;
- enable RLS;
- add indexes for common foreign keys;
- avoid hard deletes for financial records unless explicitly approved.

Expected core tables:

- `profiles`
- `contractors`
- `projects`
- `contractor_projects`
- `document_requirements`
- `contractor_documents`
- `timesheets`
- `timesheet_entries`
- `payment_statements`
- `invoices`
- `payments`
- `audit_logs`

Before changing schema, explain the migration and why it is needed.

---

## 13. Storage rules

Use private buckets:

```text
contractor-documents
contractor-invoices
```

Do not put files in public buckets.

Suggested path pattern:

```text
contractors/{contractor_id}/documents/{document_id}-{safe_filename}.pdf
contractors/{contractor_id}/invoices/{invoice_id}-{safe_filename}.pdf
```

Allowed file types in MVP:

- PDF.

Optional later:

- PNG/JPG for evidence documents, only if needed.

---

## 14. UI/UX rules

The UI must be sober, compact and professional.

Use B2B backoffice style.

Avoid:

- fake SaaS marketing language;
- generic startup landing-page style;
- generic blue dashboard look;
- lorem ipsum;
- John Doe / Jane Smith;
- emojis;
- random gradients;
- oversized meaningless cards;
- unnecessary animations;
- placeholder data in production screens.

Use practical labels:

- Pending timesheets;
- Invoices awaiting review;
- Contractor documents;
- Submit monthly hours;
- Payment status;
- Correction required;
- Approved for payment.

The app must be responsive, but it is not a mobile app.

Priority:

1. desktop;
2. laptop;
3. tablet;
4. mobile usable.

---

## 15. Coding standards

Use:

- small components;
- meaningful file names;
- meaningful variable names;
- TypeScript types;
- Zod schemas for validation;
- React Hook Form for forms;
- reusable status components;
- clear error handling;
- loading states;
- empty states;
- accessible labels.

Avoid:

- huge components;
- duplicated logic;
- unnecessary comments;
- comments that merely repeat the code;
- hardcoded business data;
- mock data in production routes;
- unrelated refactoring;
- adding features that were not requested.

---

## 16. Git rules

Use human commit messages.

Good examples:

```text
Add base application shell
Add contractor profile schema
Add timesheet validation rules
Add private document upload flow
Fix contractor invoice access policy
```

Bad examples:

```text
updates
fix
AI generated code
final version
stuff
```

Work in small branches.

Do not make large unreviewed commits.

Do not mention that code was AI-generated in commit messages or product documentation.

---

## 17. Testing rules

After every implementation step, provide manual test steps.

Minimum checks:

- app builds;
- TypeScript errors are fixed;
- lint issues are addressed;
- admin flow works;
- contractor flow works;
- contractor cannot access another contractor's data;
- document access is not public;
- approved timesheets cannot be edited by contractors;
- invoice status flow works.

Use fake data only during development and staging.

---

## 18. Documentation rules

Keep documentation useful but not bloated.

Maintain:

- `README.md`
- `CHANGELOG.md`
- `03_TECHNICAL_DESIGN_GUIDE.md`
- `02_SETUP_GUIDE_FROM_ZERO.md`
- `AGENTS.md`

Update documentation when:

- setup steps change;
- environment variables change;
- database schema changes;
- deployment steps change;
- major business rules change.

Documentation must be understandable for a junior developer.

---

## 19. Deployment documentation requirements

Technical documentation must include production deployment guidance for:

- Supabase EU project;
- Supabase migrations;
- Supabase RLS policies;
- Supabase private Storage buckets;
- Vercel GitHub deployment;
- Vercel environment variables;
- Vercel preview and production deployments;
- Cloudflare DNS record for `portal.anvelconsulting.com`;
- Cloudflare SSL/TLS considerations;
- staging vs production separation.

Do not assume the developer already knows these concepts.

Explain what each platform does and why it is used.

---

## 20. Ask-before-doing rules

Ask before doing any of the following:

- changing the approved stack;
- adding paid APIs;
- adding automatic bank payments;
- adding electronic signature;
- collecting passport/ID documents by default;
- adding candidate CRM features;
- adding AI scoring;
- adding analytics/tracking;
- storing SAP client data;
- creating public storage buckets;
- weakening RLS policies;
- changing role permissions;
- performing large refactors;
- deleting financial records.

---

## 21. Required behaviour at the start of a new Codex session

At the start of each session, Codex should:

1. inspect the repository state;
2. read this `AGENTS.md` file;
3. identify the current branch;
4. identify whether there are uncommitted changes;
5. summarise the next safe step;
6. ask for confirmation before major changes.

---

## 22. Final instruction

Build this project slowly and clearly.

The goal is not only to finish the portal. The goal is for the developer to understand the architecture, the database, authentication, authorisation, deployment and security decisions well enough to explain them in a technical interview.
