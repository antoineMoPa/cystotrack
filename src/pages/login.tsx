import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { Button, Card, Field, Input } from "../components/ui";

const MINIMUM_SIGNUP_DELAY_MS = 1800;

export function LoginPage({ session }: { session: Session | null }) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [website, setWebsite] = useState("");
  const [formOpenedAt] = useState(() => Date.now());
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (session) return <Navigate to="/" replace />;

  async function sendCode(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const appearsAutomated = website !== "" || Date.now() - formOpenedAt < MINIMUM_SIGNUP_DELAY_MS;
    if (appearsAutomated) {
      setBusy(false);
      setSent(true);
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setMessage(error.message); else setSent(true);
  }
  async function verifyCode(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    setBusy(false);
    if (error) setMessage("Le code est invalide ou expiré.");
  }
  return <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
    <Card className="w-full">
      <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Journal personnel</p>
      <h1 className="text-3xl font-bold">Bienvenue sur CystoTrack</h1>
      <p className="mb-6 mt-2 text-muted-foreground">Consignez les facteurs qui peuvent influencer vos symptômes.</p>
      {!sent ? <form className="space-y-4" onSubmit={sendCode}>
        <div className="absolute -left-[10000px]" aria-hidden="true">
          <label htmlFor="website">Site web</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
        </div>
        <Field label="Adresse courriel"><Input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Button className="w-full" disabled={busy}>{busy ? "Envoi…" : "Recevoir un code"}</Button>
      </form> : <form className="space-y-4" onSubmit={verifyCode}>
        <Field label="Code reçu par courriel"><Input inputMode="numeric" autoComplete="one-time-code" required value={token} onChange={(event) => setToken(event.target.value)} /></Field>
        <Button className="w-full" disabled={busy}>{busy ? "Vérification…" : "Se connecter"}</Button>
        <button type="button" className="w-full text-sm text-primary underline" onClick={() => setSent(false)}>Utiliser une autre adresse</button>
      </form>}
      {message && <p role="alert" className="mt-4 text-sm text-destructive">{message}</p>}
    </Card>
  </main>;
}
