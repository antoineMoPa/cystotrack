# CystoTrack

Food and symptom journal for interstitial cystitis.

## Local development

Requirements: NVM, Node.js 24, Docker, and the Supabase CLI.

```bash
nvm use
npm install
npx supabase start
```

Create the local environment file:

```bash
cp .env.example .env.local
npx supabase status
```

Copy the local API URL and publishable/anon key into `.env.local`, then start the frontend:

```bash
npm run dev
```

Open the frontend at `http://localhost:5173`. Local authentication emails are available in Mailpit at `http://127.0.0.1:54324`.

## Terraform

Terraform changes are not applied automatically. Apply them manually:

```bash
terraform -chdir=infrastructure plan
terraform -chdir=infrastructure apply
```
