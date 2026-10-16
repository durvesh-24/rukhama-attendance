# Rukhama Tent House Attendance

Admin-only attendance app for a per-day labour business. Works on phone and laptop.

- **Employees**: add, edit, photo, mark exit, rejoin. Each join and exit has a date and a note. Nothing is ever deleted.
- **Attendance in shifts**: Shift 1 (8:00 AM–1:00 PM) and Shift 2 (3:00 PM–8:00 PM), each marked Present / Absent / Leave, plus an extra **Night shift** (9:00 PM onwards) added only for those who worked it. Notes per shift. Past dates can be edited.
- **Dashboard**: today's per-shift numbers, daily per-shift chart, 12-month headcount trend.
- **Employee report**: pick one employee and a month or range to see charts, a calendar, night-shift dates, leave dates and a day-by-day table, then download it as Excel.
- **All reports**: one month or a range, all or chosen employees. The Excel file has 4 sheets: Attendance grid (S1/S2/N per day), Summary, Night & Leave Dates, and Join-Exit Log.

**Stack**: Next.js 16 (App Router), Tailwind CSS 4 + shadcn/ui, Supabase (Postgres, Auth, Storage), ExcelJS, Recharts, Zod.
**Hosting**: Vercel (app) + Supabase (database).

---

## Why Supabase

| | Supabase (chosen) | Neon / Vercel Postgres | Firebase | MongoDB Atlas |
|---|---|---|---|---|
| Database | Postgres | Postgres | NoSQL | NoSQL |
| Login built in | ✅ | ❌ (add Auth.js etc.) | ✅ | ❌ |
| Photo storage built in | ✅ | ❌ | ✅ | ❌ |
| Row-level security | ✅ | manual | rules | manual |
| Free plan | 500 MB DB, 1 GB files | 0.5 GB | generous | 512 MB |

A few years of attendance for 40–100 workers is only a few MB, so the **free plans of Supabase and Vercel are enough**. Pricing can change, so check the current plans when you sign up.

## 2. Local setup

```bash
npm install
cp .env.example .env.local        # Windows PowerShell: Copy-Item .env.example .env.local
# fill in the three values in .env.local

npx supabase login                # opens the browser once
npx supabase link --project-ref <your-project-ref>   # asks for the database password
npx supabase db push              # creates tables, security rules, functions, photo bucket
npm run db:types                  # optional: regenerate types/database.types.ts from the live DB
npm run make-admin -- you@example.com "Your Name"
npm run dev                       # http://localhost:3000
```

**No CLI?** You can also open Supabase → **SQL Editor** and run the four files in `supabase/migrations/` one by one, in name order.

## Security model

- There is no sign-up page. Only users listed in the `admins` table can use the app.
- `public.is_admin()` checks `auth.uid()` against `admins`. Every table and the photo bucket have **Row Level Security** policies that allow access only when `is_admin()` is true.
- `proxy.ts` (the Next.js 16 name for `middleware.ts`) refreshes the session and sends logged-out visitors to `/login`.
- The `(app)` layout, every Server Action and `/api/export` check `is_admin` again on the server.
- The service role key is used only by `scripts/make-admin.ts` on your own computer.

## Business rules

- **Exit** closes the current join–exit period and sets status to `EXITED`. Employee data and all attendance stay.
- **Rejoin** opens a new period. The rejoin date must be after the last exit date. One employee can have many periods.
- The attendance page lists only employees whose join–exit period covers that date. The exit date counts as the last working day.
- Each date has up to three marks: Shift 1, Shift 2 (Present / Absent / Leave) and Night (worked, or nothing). **Days worked** = dates with at least one shift present. **Leave days** = dates with any shift on leave; one shift on leave is a half day, both is a full day.
- The app does not track wages or pay. The `daily_wage`, `night_wage` and `overtime_hours` columns are still in the database but are unused.
- Dates are shown as DD-MM-YYYY. "Today" is calculated in Asia/Kolkata time.

## Project structure

```
app/
  login/                    login page + server actions (no signup)
  (app)/                    protected area (sidebar on laptop, bottom nav on phone)
    dashboard/  attendance/  employees/  employees/[id]/  employee-report/  reports/  settings/
  api/export/               Excel downloads: all employees, and employee/ for one person
components/                 UI, charts, dialogs, attendance marker
components/ui/              shadcn/ui components
lib/                        auth guard, IST date helpers, zod schemas, report data, Excel builder
utils/supabase/             client.ts, server.ts, middleware.ts
proxy.ts                    session refresh + login redirect
supabase/migrations/        schema, RLS, functions, storage
scripts/make-admin.ts       promote an Auth user to admin
types/database.types.ts     database types (npm run db:types)
```
