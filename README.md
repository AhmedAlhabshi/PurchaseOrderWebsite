# Purchase Orders

A small internal web app to **create, send and track Purchase Orders**.
Employees register with their own name, email, phone and password, then sign in.
The existing shared site password remains the outer access gate in production.

### Local account preview (isolated database)

Run `npm run dev:local` and open `http://127.0.0.1:3000/register`.
This creates `.env.local` and an SQLite database under `.local/`. The local
server binds to your computer only, uses email preview mode, and skips the
shared site password. Register your account, add a test supplier, and create a
PO. All these records stay in the local database. The script refuses to
overwrite an existing `.env.local` configured for another database.

`npm run setup:local` prepares this database without starting the server.
`npm test` runs the unit tests. Stop the local server before a production build;
`npm run dev:local` regenerates the SQLite client on restart.

### Employee accounts

- Registration requires name, email, phone and a password of at least 8 characters.
- Passwords are salted and hashed with scrypt. Raw passwords are never saved.
- Sessions last 30 days in an HttpOnly cookie; logout revokes the session.
- The list, order details and PDF viewing are available after the shared site gate,
  without employee login. Creating/revising orders and all other writes require
  an employee session checked on the server. Sign-in returns to the requested
  creation/edit page. Supplier management and account pages also require login.
- New POs snapshot the authenticated employee's name/email/phone. The form
  cannot choose another preparer, and submitted identity fields are overridden.
- Revisions and draft sending keep the original preparer's saved details.
- Existing POs remain intact; `/preparers` now redirects to **My account**.
- Account registration is open to everyone who passes the shared site gate.
  Email confirmation and password recovery are not part of this local preview.

Before production rollout, remove local overrides from the deployment environment,
generate the PostgreSQL client (`npm run prisma:generate`), and review/apply
the added User, Session, AuthThrottle tables and nullable PO author link against
the deployment database. Do not run `db:push` with the local SQLite schema against
production. No production database changes are made by `dev:local`.

- **Purchase Orders** – a list of all orders with a field-scoped search
  (search by anything: PO number, supplier, item code, prepared-by, sent/arrival
  date) plus a status filter.
- **Create Purchase Order** – a simple form → generate a PDF → preview → send.
  Each item description shows whether it was previously ordered, with a link to
  the newest matching PO. Matching ignores case and extra whitespace, searches
  all suppliers, and excludes drafts and the order currently being edited.
- **Purchase Order Details** – full order data, PDF (view/download), editing with
  revisions, and per-item delivery tracking.
- **Suppliers** – a small screen to manage suppliers (name + abbreviation +
  current number). The abbreviation drives the PO number.

Built with **Next.js 14 (App Router) + TypeScript**, **Prisma + PostgreSQL**
(Neon — a free managed database), **@react-pdf/renderer** for the PDF (the
generated file is stored in the database), and **Nodemailer** for email. A shared
password gate (HTTP Basic Auth) protects the app when it is exposed on the
internet.

### PO number format

`PO-DIT-026-TYR-018`

- `DIT` — fixed company code (Diamond Tools)
- `026` — the year (2026 → 026, 2027 → 027)
- `TYR` — the supplier abbreviation
- `018` — a **per-supplier** counter that resets each calendar year

Each supplier stores a "current number" you can edit on the **Suppliers** screen
(handy when migrating existing counts from Excel — set it to the last number used
and the next PO continues from there).

### Editable email message

The PO form includes an **Email Message** field prefilled with the standard
message. It updates with the contact, PO number and preparer until edited.
You can customize or clear it, or use **Reset to default**. Custom text is saved
with drafts and used when sending or revising the order. A blank message stays
blank; the PDF is still attached. This field does not change the PDF content.

When deploying this change to an existing database, run `npm run db:push` against
the deployment database before deploying the updated app to add the nullable
`PurchaseOrder.emailBody` column. Existing orders continue using the default.

### Editing & revisions

Open any PO → **Edit / Revise**. You can change anything (items, prices, emails,
etc.). Saving keeps the same PO number, bumps the revision (`rev1`, `rev2`, …),
regenerates the PDF (marked "REVISED (rev1)") and re-sends the email. Received
quantities are preserved across a revision.

### Delivery tracking (partial / multiple batches)

On the details page, each item shows **ordered / received / remaining**. Record a
delivery per item — full or partial — and repeat for later batches. The order
status is **Partially Arrived** until every item is fully received, then it
becomes **Arrived at Warehouse** automatically.

---

## 1. Requirements

- Node.js 18.17+ (tested on Node 24)
- npm

## 2. Setup (first time)

```bash
npm install
cp .env.example .env      # then paste your Neon DATABASE_URL / DIRECT_URL
npm run setup             # creates the tables in your database (no sample data)
npm run dev               # open http://localhost:3000
```

`npm run setup` does two things:
1. `prisma generate` – builds the DB client
2. `prisma db push` – creates the tables in the database pointed to by
   `DATABASE_URL` / `DIRECT_URL`

You need a PostgreSQL database. The easiest free option is **Neon** (see the
deploy section below) — the same database works for both local development and the
live site. The app starts with **no data**: add your suppliers on the
**Suppliers** screen, then create your first purchase order.

> On Windows, stop the dev server before running `npm run build` or
> `prisma generate` again — a running server locks the Prisma engine file.

## 3. Email configuration

Email is **optional**. Open `.env`:

```env
SMTP_HOST=""
SMTP_PORT="587"
SMTP_SECURE="false"     # "true" for port 465
SMTP_USER=""
SMTP_PASSWORD=""
MAIL_FROM="Purchasing <purchasing@example.com>"
```

- **Left empty (default): preview mode.** When you approve & send, the order and
  PDF are saved and the app clearly tells you the email was *prepared but not
  actually sent*. Nothing is emailed.
- **Filled in: real sending.** The app emails the Main Email, CCs everyone in the
  CC list, attaches the PDF, and uses the subject `Purchase Order - <PO Number>`.

Works with any SMTP provider (Gmail app password, Outlook, SendGrid, Mailgun…).
Example for Gmail:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="you@gmail.com"
SMTP_PASSWORD="your-16-char-app-password"
MAIL_FROM="Purchasing <you@gmail.com>"
```

## 4. Trying the full process

1. Open `http://localhost:3000` → the list is empty on a fresh install. (Once you
   have orders, use the search box with the field selector — e.g. search by Item
   Code — and the status filter.)
2. Click **Create Purchase Order**.
3. Choose a **supplier** (or click **+ New** to add one on the spot). The
   **PO Number** is generated from the supplier abbreviation; **PO Date** defaults
   to today. Add CC emails with **+ Add CC email**.
4. In **Items**, add rows (**+ Add Item**). `Line Total = Qty × Unit Price` and the
   **Grand Total** update live. Validation checks required fields, valid emails,
   quantity &gt; 0, unit price ≥ 0, and at least one item.
5. Click **Generate PO & Preview** → the PDF preview opens.
6. Click **Approve & Send** (or **Back to Edit**). The order is saved, the PDF is
   stored, and the email is sent (or previewed). Repeat clicks are blocked.
7. You land on **Details**:
   - **Update Status** — confirm the order, set expected shipping/arrival dates,
     add notes.
   - **Receive Items** — record deliveries per item (full, partial, or in
     batches). The status moves to *Partially Arrived* and then *Arrived* on its
     own.
   - **Edit / Revise** — change anything and re-send as the next revision.
   - Every change is timestamped in **Update History**.

## 5. Where data lives

- **Everything is in the PostgreSQL database** — purchase orders, items, status
  history, and the generated **PDF bytes** (stored in a column on the order).
  There is nothing to back up on the filesystem; Neon handles database backups.

## 6. The PDF header

The company hero (logos + name band + "Purchase Order" title) is reproduced
exactly from your template. The source image is `assets/hero.png`; it is embedded
as a data URI in `src/lib/heroImage.ts` so the PDF renders identically on any
host. To change the header, replace `assets/hero.png` and regenerate the module:

```bash
node -e "const fs=require('fs');const b=fs.readFileSync('assets/hero.png').toString('base64');fs.writeFileSync('src/lib/heroImage.ts',`export const HERO_DATA_URI =\n  \"data:image/png;base64,${b}\";\n`)"
```

Everything below the hero (supplier fields, items table, totals, footer) is drawn
from the order data in `src/lib/pdf.tsx`.

## 7. Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run setup` | Generate client + create the tables |
| `npm run db:push` | Apply schema changes to the database |

## 8. Deploying to the internet (Vercel + Neon — free, always on)

This runs the site 24/7 in the cloud, independent of any office computer.

**A. Create the database (Neon)**
1. Sign up at <https://neon.tech> (free) and create a project.
2. In the project's **Connection Details**, copy two connection strings:
   - the **Pooled** string (host contains `-pooler`) → this is `DATABASE_URL`
   - the **Direct** string → this is `DIRECT_URL`
   Both should end with `?sslmode=require`.

**B. Push the code to GitHub**
1. Create an empty repository on <https://github.com>.
2. From this folder:
   ```bash
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```

**C. Deploy on Vercel**
1. Sign up at <https://vercel.com> and **Import** the GitHub repository.
2. Add these **Environment Variables** (Project → Settings → Environment Variables):
   - `DATABASE_URL`, `DIRECT_URL` — from Neon
   - `APP_USER`, `APP_PASSWORD` — the shared login for your team
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`,
     `MAIL_FROM` — your email settings (leave blank for preview mode)
3. Deploy. Then create the tables once by running locally against Neon:
   ```bash
   npm run db:push
   ```
   (or run it from Vercel via a one-off command). After that the live site is
   ready — open it, enter the shared password, add your suppliers, and go.

**Updating later:** push to GitHub → Vercel redeploys automatically.
