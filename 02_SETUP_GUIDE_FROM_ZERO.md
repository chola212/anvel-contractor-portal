# Setup Guide from Zero

Project: **ANVEL Contractor Portal**  
Audience: second-year Computer Science student starting from a clean laptop  
Purpose: install the tools, create the GitHub repository, connect VS Code and Codex, and prepare the project for local development and later deployment.

This guide is intentionally detailed. The goal is not only to make the project run, but to understand what each tool does and why it is needed.

---

## 1. Big picture

You will build a full-stack web application.

A full-stack application has:

- a frontend: what users see in the browser;
- a backend: server-side logic, authentication, file access and database interaction;
- a database: structured storage for users, contractors, projects, timesheets and invoices;
- storage: private files such as contracts and invoices;
- deployment: a way to publish the app online.

For this project, the tools are:

| Tool | What it does |
|---|---|
| VS Code | Code editor |
| Git | Tracks code changes locally |
| GitHub | Stores the repository online |
| Codex | AI coding assistant inside VS Code / development workflow |
| Node.js | Runs JavaScript/TypeScript tooling |
| Next.js | Web application framework |
| TypeScript | Safer JavaScript with types |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Reusable UI components |
| Supabase | Database, authentication and file storage |
| Vercel | Hosts the Next.js application |
| Cloudflare | DNS, proxy and domain security |

---

## 2. Accounts to create

Create or confirm access to these accounts:

1. GitHub account
2. ChatGPT account with Codex access
3. Supabase account
4. Vercel account
5. Cloudflare account with access to `anvelconsulting.com`

Use a password manager. The project should not reuse passwords.

Recommended security setup:

- enable MFA on GitHub;
- enable MFA on Supabase;
- enable MFA on Vercel;
- enable MFA on Cloudflare;
- enable MFA on the email account used for the project.

---

## 3. Install VS Code

### What VS Code is

VS Code is the editor where you will write, read and run the project code.

### Steps

1. Go to the official Visual Studio Code website.
2. Download the installer for your operating system.
3. Install it using the default options.
4. Open VS Code.
5. Open the Extensions panel on the left sidebar.

### Recommended VS Code extensions

Install these extensions:

- Codex extension by OpenAI, following the official Codex IDE documentation;
- GitHub Pull Requests and Issues;
- ESLint;
- Prettier;
- Tailwind CSS IntelliSense;
- Error Lens, optional but useful for beginners.

Do not install random extensions unless you understand what they do.

---

## 4. Install Git

### What Git is

Git tracks the history of code changes.

It lets you answer questions such as:

- What changed?
- Who changed it?
- When was it changed?
- Can we go back to an earlier version?

### Steps on Windows

1. Download Git for Windows from the official Git website.
2. Run the installer.
3. Keep default options unless you know why you need to change them.
4. After installation, open PowerShell or the VS Code terminal.
5. Run:

```bash
git --version
```

Expected result:

```text
git version x.y.z
```

### Configure Git identity

Use the name and email that should appear in Git commits.

```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

To verify:

```bash
git config --global --list
```

---

## 5. Install Node.js

### What Node.js is

Node.js lets your computer run JavaScript outside the browser. Next.js uses Node.js for development tools, local server, builds and package installation.

### Steps

1. Install the current LTS version of Node.js from the official Node.js website.
2. Open a new terminal.
3. Run:

```bash
node --version
npm --version
```

Expected result:

```text
vXX.X.X
X.X.X
```

Use LTS, not experimental versions.

---

## 6. Create the GitHub repository

### What a repository is

A repository is the project folder plus its Git history.

The local repository lives on your computer. The remote repository lives on GitHub.

### Recommended repository details

- Repository name: `anvel-contractor-portal`
- Visibility: Private
- README: Yes
- `.gitignore`: Node
- License: No license for now, because this is private company software

### Steps in GitHub

1. Sign in to GitHub.
2. Click the `+` icon in the top right.
3. Choose `New repository`.
4. Repository name: `anvel-contractor-portal`.
5. Select `Private`.
6. Add a README.
7. Add `.gitignore` and choose `Node`.
8. Do not add a license yet.
9. Click `Create repository`.

---

## 7. Clone the repository into VS Code

### What cloning means

Cloning downloads the GitHub repository to your computer and connects the local folder to GitHub.

### Steps

1. Open VS Code.
2. Press `Ctrl + Shift + P`.
3. Search for `Git: Clone`.
4. Paste the GitHub repository URL.
5. Choose a clean local folder, for example:

```text
C:\Projects\anvel-contractor-portal
```

6. Open the cloned folder in VS Code.

### Check that Git works

In the VS Code terminal, run:

```bash
git status
```

Expected result:

```text
On branch main
Your branch is up to date with 'origin/main'.
```

---

## 8. Connect VS Code with GitHub

VS Code may ask you to sign in to GitHub.

Accept the sign-in flow.

This allows VS Code to:

- push commits;
- pull changes;
- show branches;
- interact with GitHub features.

Do not share GitHub tokens manually. Use the VS Code sign-in flow.

---

## 9. Install and use Codex in VS Code

### What Codex is for this project

Codex is an AI coding assistant. It can inspect files, propose changes, explain code and implement tasks.

For this project, Codex must be used as a learning assistant, not as an automatic generator.

### Steps

1. Open VS Code.
2. Open the Extensions panel.
3. Search for the official Codex extension by OpenAI.
4. Install it.
5. Sign in using the account with Codex access.
6. Open the Codex sidebar.
7. Make sure the current workspace is `anvel-contractor-portal`.

If the exact screen differs, follow the latest official Codex IDE extension documentation.

### Important Codex rule

Before asking Codex to write code, first add these four documents to the repository:

- `01_INITIAL_CODEX_PROMPT.md`
- `02_SETUP_GUIDE_FROM_ZERO.md`
- `03_TECHNICAL_DESIGN_GUIDE.md`
- `AGENTS.md`

Then paste the prompt from `01_INITIAL_CODEX_PROMPT.md` into Codex.

---

## 10. Create the initial project branch

Work should not happen directly on `main`.

Create a development branch:

```bash
git checkout -b initial-project-setup
```

Check:

```bash
git branch
```

You should see:

```text
* initial-project-setup
  main
```

---

## 11. Add the documentation files first

Copy the four documents into the repository root:

```text
anvel-contractor-portal/
  01_INITIAL_CODEX_PROMPT.md
  02_SETUP_GUIDE_FROM_ZERO.md
  03_TECHNICAL_DESIGN_GUIDE.md
  AGENTS.md
  README.md
  .gitignore
```

Commit them before writing application code:

```bash
git add .
git commit -m "Add project planning and agent instructions"
git push -u origin initial-project-setup
```

### Why this matters

The documentation gives Codex rules before it starts coding.

Without these files, Codex may make generic choices, create unnecessary features or generate a project that looks like a template.

---

## 12. Create the Next.js project

Only do this after Codex has inspected the repository and confirmed the plan.

Expected command:

```bash
npx create-next-app@latest . --typescript --eslint --app --src-dir --tailwind --import-alias "@/*"
```

Meaning:

| Option | Meaning |
|---|---|
| `.` | Create the app in the current folder |
| `--typescript` | Use TypeScript |
| `--eslint` | Add linting |
| `--app` | Use the Next.js App Router |
| `--src-dir` | Put source code inside `src/` |
| `--tailwind` | Add Tailwind CSS |
| `--import-alias "@/*"` | Allow imports like `@/components/Button` |

After creation:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## 13. Basic Git workflow

Use this workflow for normal work:

```bash
git status
git add .
git commit -m "Short human description"
git push
```

Good commit messages:

```text
Add base layout and navigation shell
Add contractor profile schema
Add timesheet entry validation
Fix contractor access policy
```

Bad commit messages:

```text
updates
fix stuff
AI generated app
final version
```

---

## 14. Branch workflow for learning

Use small branches:

```bash
git checkout main
git pull
git checkout -b feature/auth-setup
```

When finished:

```bash
git add .
git commit -m "Add Supabase authentication setup"
git push -u origin feature/auth-setup
```

Then open a Pull Request on GitHub.

### Why Pull Requests are useful

A Pull Request lets you review:

- files changed;
- code added;
- code removed;
- comments from Codex or reviewers;
- whether tests pass.

For learning, reviewing a Pull Request is more useful than accepting all changes blindly.

---

## 15. Environment variables

### What environment variables are

Environment variables are configuration values that change between local, staging and production.

Examples:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Secrets must not be committed to GitHub.

### Files

Create:

```text
.env.local
.env.example
```

`.env.local` contains real local values. It must stay ignored by Git.

`.env.example` contains placeholders and is committed.

Example `.env.example`:

```text
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

Never put the Supabase service role key in frontend code.

---

## 16. Supabase account and project setup

This is normally done after the base app exists.

### What Supabase provides

Supabase will provide:

- PostgreSQL database;
- authentication;
- private file storage;
- SQL editor;
- RLS policies.

### Production principle

The Supabase project must be created in an EU region because the portal will handle contractor personal data.

### Local/staging/production recommendation

Use separate Supabase projects:

1. Development or staging: fake data only.
2. Production: real contractor data only after security review.

For a beginner, starting with one development Supabase project is fine, but do not put real data in it.

---

## 17. Vercel setup for deployment

### What Vercel does

Vercel hosts the Next.js application.

It connects to GitHub and deploys automatically when code is pushed.

### Steps when ready

1. Create or sign in to Vercel.
2. Choose `Add New Project`.
3. Import `anvel-contractor-portal` from GitHub.
4. Confirm framework: Next.js.
5. Add environment variables.
6. Deploy.
7. Review the deployment URL.

Vercel will create preview deployments for branches and production deployments for the production branch depending on project settings.

---

## 18. Cloudflare setup for production domain

### What Cloudflare does

Cloudflare manages DNS records and can proxy web traffic.

The goal is:

```text
portal.anvelconsulting.com
```

pointing to the Vercel deployment.

### Basic production steps

1. Log in to Cloudflare.
2. Open the `anvelconsulting.com` zone.
3. Go to DNS.
4. Add a CNAME record:

```text
Type: CNAME
Name: portal
Target: value shown by Vercel
Proxy: usually enabled for web traffic, unless Vercel verification requires DNS-only during setup
```

5. In Vercel, add the domain:

```text
portal.anvelconsulting.com
```

6. Follow Vercel's DNS verification instructions.
7. After verification, confirm HTTPS works.
8. In Cloudflare SSL/TLS settings, use a secure mode compatible with Vercel.

Always follow the exact DNS target shown in the Vercel dashboard, because it can change depending on the project configuration.

---

## 19. First safe development session

A good first session looks like this:

1. Open VS Code.
2. Open the repository folder.
3. Confirm you are on a feature branch.
4. Open Codex.
5. Paste the prompt from `01_INITIAL_CODEX_PROMPT.md`.
6. Ask Codex to inspect the repository only.
7. Read its plan.
8. Ask questions if something is unclear.
9. Approve only one small step.
10. Run the app locally.
11. Commit the small change.
12. Write down what you learned.

---

## 20. What to learn before coding too much

Before building screens, understand these concepts:

- what a repository is;
- what a branch is;
- what a commit is;
- what a Pull Request is;
- what a frontend component is;
- what a database table is;
- what a primary key is;
- what a foreign key is;
- what authentication means;
- what authorisation means;
- what RLS means;
- what an environment variable is;
- why secrets must not be committed;
- why production data must not be used for testing.

---

## 21. Official references checked when preparing this guide

These are the official documentation areas that should be re-checked if screens or product names change:

- OpenAI Codex IDE extension and Codex quickstart documentation
- GitHub account and repository documentation
- Supabase Next.js, Auth, RLS and Storage documentation
- Vercel Git deployment, environment variable and custom domain documentation
- Cloudflare domain onboarding, DNS proxy and SSL/TLS documentation
