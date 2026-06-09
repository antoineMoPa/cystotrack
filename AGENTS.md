# CystoTrack

## User Specification

- Mobile-first personal journal for interstitial cystitis.
- Helps users record factors that may influence bladder symptoms.
- One editable entry per local calendar day.
- Daily fields are optional and may be completed progressively.
- Tracks:
  - Morning and evening bladder pain from 0 to 10.
  - Perceived and external stress from 0 to 10.
  - Previous night's sleep in hours.
  - Total hydration in millilitres.
  - Optional notes.
  - Foods with an optional approximate consumption time.
- Remembers each user's food library and suggests previous foods.
- Provides editable chronological history.
- Exports one UTF-8 CSV row per day with timed foods in one column.
- V1 is for rigorous data collection, not diagnosis or automated analysis.
- Food classification, correlations, graphs, and recommendations are V2.

## Developer Specification

- React 19, TypeScript, Vite, Tailwind CSS, and shadcn/ui conventions.
- TanStack Query manages server state; React Hook Form and Zod manage forms.
- Supabase provides email OTP authentication, PostgreSQL, RPC, and Row Level Security.
- Cloudflare Pages hosts the SPA; Terraform manages Cloudflare and Supabase resources.
- Supabase migrations and pgTAP tests live under `supabase/`.
- GitHub Actions validates the web app, database, and Terraform configuration.
- CI runs on `main` and trusted collaborator PRs; production deployment uses protected secrets.
- Node.js 24 is pinned in `.nvmrc`; NVM is required for local development.

## Data and Security Rules

- Every user-owned table must be protected by RLS using `auth.uid()`.
- Foods are personal to a user and case-insensitively unique through PostgreSQL `citext`.
- A day is unique by `(user_id, date)`.
- Saving a day and replacing its consumptions must remain transactional.
- Never expose Supabase service-role keys, database passwords, or infrastructure tokens.
- Browser-visible Supabase publishable/anon keys are not secrets; RLS remains mandatory.
- Keep `.env.*`, Terraform state/plans, and backend credentials out of Git.

## Engineering Rules

- Avoid normalization functions at all costs.
- Use explicit mapping functions, enums, typed objects, and database constraints instead.
- Preserve explicit mappings between database snake_case fields and TypeScript models.
- Keep user-facing copy consistent with the application's current locale.
- Prefer existing patterns and tightly scoped changes over new abstractions.
- Add tests proportional to behavior and security impact.
- Before completing changes, run:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - Database tests when the local Supabase stack is available.
  - Terraform formatting and validation for infrastructure changes.
