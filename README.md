# CystoTrack

Food and symptom journal for interstitial cystitis. V1 records daily symptoms, stress, sleep, hydration, notes, and timed food consumption.

## Local development

Requirements: NVM, Node.js 24, Docker, and the Supabase CLI.

```bash
nvm use
npm install
npx supabase start
cp .env.example .env.local
```

Copy the local API URL and anon key printed by `supabase status` into `.env.local`, then run:

```bash
npm run dev
```

Mailpit is available at `http://127.0.0.1:54324` for local OTP emails.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run db:test
terraform -chdir=infrastructure fmt -check -recursive
terraform -chdir=infrastructure init -backend=false
terraform -chdir=infrastructure validate
```

## Deployment

1. Apply `infrastructure/bootstrap` once to create the R2 state bucket.
2. Configure `infrastructure/backend.hcl` from the example and initialize the main Terraform stack.
3. Apply `infrastructure` to create Supabase and Cloudflare Pages resources.
4. Configure the GitHub environment `production` with the secrets referenced by `.github/workflows/deploy.yml`.
5. Configure production SMTP and OTP email settings in Supabase.

The production workflow pushes database migrations before deploying the built SPA to Cloudflare Pages.
