# Security & Handover — Rukhama Tent House Attendance

Live app: **https://rukhama-attendance.vercel.app**
Security review completed: 16-10-2026

## Who can access what

| Who | Access |
|---|---|
| Visitor (not logged in) | Login page only. All other pages redirect to login; data APIs return 401. |
| Logged-in user who is **not** in the `admins` table | Nothing. Logged out at login; database returns no rows. |
| Admin | Full app: employees, attendance, reports, Excel downloads. |

- **No public sign-up.** Sign-ups are disabled in Supabase; a test sign-up was refused.
- New admins can only be added by the developer (`npm run make-admin`) using the secret key, which never leaves the developer's computer.

## Protections in place (all verified on the live system)

**Database (Supabase / Postgres)**
- Row Level Security is ON for every table; every rule requires `is_admin()`.
- Anonymous visitors have no table permissions at all (tested: 401 on every table and function).
- Employees and their join/exit history **cannot be deleted**, even by a logged-in admin session, so history can't be wiped.
- Attendance rules are enforced by the database (one mark per employee/date/shift; a night shift can only be "worked").
- Employee photos are in a **private** bucket (JPG/PNG/WEBP, max 5 MB), shown only through links that expire after 1 hour.
- Database functions use a fixed `search_path` (no hijacking).

**Application (Next.js on Vercel)**
- Every page, server action and Excel download re-checks admin rights on the server.
- The secret key and DB password are **not** in the website code (scanned all live JavaScript).
- HTTPS only (HSTS), no embedding in other sites (`X-Frame-Options: DENY`, CSP `frame-ancestors 'none'`), `nosniff`, strict referrer and permissions policies, server signature hidden.
- Changing the password requires the current password.
- All inputs are validated on the server (dates, shifts, IDs, text lengths, photo type/size).
- Search engines are told not to index the site.
- App dependencies: `npm audit --omit=dev` reports **0 vulnerabilities**.

## Handover checklist (do these before giving it to the client)

1. **Give the client their own admin login.** Create their user in Supabase → Authentication → Users → *Add user* (tick *Auto Confirm User*), then run `npm run make-admin -- client@email.com "Client Name"`. Ask them to change the password from **Settings** on first login.
2. **Remove or keep the developer admin.** To remove: `delete from public.admins where user_id = '<id>';` in the Supabase SQL editor (the auth user can also be deleted in Authentication → Users).
3. **Turn on leaked-password protection** (Supabase → Authentication → Policies/Settings) and set a minimum password length of 10+.
4. **Account ownership.** The Supabase and Vercel projects are currently in the developer's accounts. Either transfer them to the client (Supabase: Organization settings → transfer project; Vercel: Project → Settings → Transfer) or agree in writing that the developer hosts them.
5. **Plans & backups.**
   - Supabase **Free** has no automatic backups and pauses after ~1 week of no use. For real business data, use **Pro** (daily backups, never pauses), or at least download the monthly Excel as a backup.
   - Vercel **Hobby** is for non-commercial use; a business should use **Pro**.
6. **If the secret key was ever shared**, rotate it in Supabase → Project Settings → API Keys.

## Known limits (accepted)

- Login attempts are rate-limited by Supabase; use strong passwords.
- Wages/pay are not tracked by the app (by request). Old wage columns remain in the database unused.
- One shared admin role: every admin can see and change everything.
