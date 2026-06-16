# Initial Codex Prompt — ANVEL Contractor Portal

Use this prompt as the first message to Codex after opening the repository in VS Code.

This prompt is not meant to generate the full application in one shot. Its purpose is to make Codex understand the product, the learning approach, the technical constraints, and the first safe implementation phase.

---

## Prompt to paste into Codex

You are helping me build the **ANVEL Contractor Portal**, a private internal web application for **ERP UTILITIES CONSULTING SERVICES LTD**.

The portal will be used to manage signed freelancers/subcontractors after they have already been selected and contractually accepted. It is not a public SaaS product, not a recruitment CRM, not a client portal, and not a legal self-billing system.

Before making any code changes, you must read and follow these repository documents:

1. `AGENTS.md`
2. `03_TECHNICAL_DESIGN_GUIDE.md`
3. `02_SETUP_GUIDE_FROM_ZERO.md`, only when setup or deployment steps are relevant

This project is also a learning project for a second-year Computer Science student. Do not simply generate code without explanation. For every implementation step:

1. Explain what you plan to change.
2. Explain why the change is needed.
3. List the files you expect to create or modify.
4. Wait for confirmation before making large or structural changes.
5. After making changes, explain what was changed in simple technical language.
6. Provide manual test steps.
7. Mention any security or data privacy implications.

## Product summary

Build a private, responsive web portal with these MVP features:

- contractor profile management;
- legal, fiscal and bank details;
- signed PDF document uploads;
- project assignment;
- monthly timesheets;
- contractors enter only the days actually worked;
- no mandatory workload field;
- no mandatory task description;
- admin approval or rejection of timesheets;
- calculation of expected payable amount;
- payment statement / invoice draft shown to the contractor;
- contractor uploads the official invoice;
- admin reviews invoices;
- admin marks payment status;
- CSV/Excel accountant export.

## Out of scope

Do not implement these unless explicitly requested later:

- candidate sourcing;
- CV database for candidates;
- AI scoring of candidates;
- public registration;
- client portal;
- SAP code storage;
- SAP client data storage;
- detailed task reporting;
- automatic legal invoice issuing on behalf of contractors;
- self-billing;
- automatic bank payments;
- electronic signature integration;
- payment card collection;
- analytics/tracking scripts.

## Technology stack

Use:

- Next.js App Router;
- TypeScript;
- Tailwind CSS;
- shadcn/ui, customised and sober;
- Supabase EU project;
- Supabase Auth;
- Supabase PostgreSQL;
- Supabase Storage;
- PostgreSQL Row Level Security;
- React Hook Form;
- Zod;
- GitHub;
- Vercel for deployment;
- Cloudflare for DNS/proxy/subdomain.

The application language is English. The design style must be sober, practical, professional and B2B-oriented.

## Important style rules

Avoid the typical AI-generated SaaS look.

Do not use:

- fake marketing slogans;
- generic “Welcome back!” dashboard copy;
- lorem ipsum;
- John Doe / Jane Smith sample data;
- emojis;
- random gradients;
- oversized generic cards everywhere;
- unnecessary animations;
- obvious comments in code;
- huge components;
- mock data inside production routes.

Use clear operational labels such as:

- Pending timesheets;
- Invoices awaiting review;
- Contractor documents;
- Submit monthly hours;
- Payment status;
- Correction required.

## Security rules

Security must be designed from the beginning, not added at the end.

Follow these rules:

- Do not commit secrets.
- Use `.env.local` for local secrets and `.env.example` for placeholders.
- Never expose Supabase service role keys in the browser.
- Enable RLS on all business tables.
- Contractors must only access their own records.
- Admin can access all records.
- Operations role has limited access.
- Use private Supabase Storage buckets for documents.
- Use signed URLs or authenticated downloads for sensitive files.
- Validate inputs server-side and client-side where appropriate.
- Record audit logs for sensitive actions.
- Do not request passport/ID documents by default.
- Do not store SAP client data, credentials or production documents.

## Required development workflow

Do not build the whole application at once.

Start with **Phase 0** only:

1. Inspect the repository.
2. Confirm whether a Next.js project already exists.
3. If it does not exist, propose the exact command to create it.
4. Propose the initial folder structure.
5. Explain the purpose of each top-level folder.
6. Do not create the database yet.
7. Do not implement authentication yet.
8. Do not generate fake production screens.

After Phase 0, proceed only after approval.

Recommended later phases:

- Phase 1: Next.js base app, layout, theme, responsive shell.
- Phase 2: Supabase client setup and environment variables.
- Phase 3: database migrations and RLS policies.
- Phase 4: authentication and roles.
- Phase 5: contractor profile module.
- Phase 6: projects and assignments.
- Phase 7: documents and private storage.
- Phase 8: timesheets.
- Phase 9: approvals and payment statements.
- Phase 10: invoices and payments.
- Phase 11: accountant export.
- Phase 12: staging and production deployment.

## First task

Start by inspecting the current repository and telling me:

1. What files exist.
2. Whether this is already a Next.js project.
3. What the first safe setup step should be.
4. Which command you would run.
5. Which files would be created.
6. What I should understand before approving the next step.

Do not modify any files until you have explained the plan.
