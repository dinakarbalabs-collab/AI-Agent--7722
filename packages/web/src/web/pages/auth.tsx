import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Sparkles } from "lucide-react";
import { authClient } from "../lib/auth";
import { Layout } from "../components/layout";

export default function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const [, nav] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "sign-up";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    const res = signup
      ? await authClient.signUp.email({ email, password, name: name || email.split("@")[0] })
      : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (res.error) return setErr(res.error.message ?? "Something went wrong");
    nav("/watchlist");
  };

  const google = async () => {
    setErr("");
    const r = await authClient.managedAuth.signIn({ provider: "google" });
    if (r.error && r.error.code !== "POPUP_CLOSED") return setErr(r.error.message ?? "Google sign-in failed");
    if (!r.error) nav("/watchlist");
  };

  const input = "w-full rounded-xl border border-white/12 bg-black/40 px-4 py-3 text-sm outline-none transition placeholder:text-dim focus:border-brand";

  return (
    <Layout>
      <div className="relative overflow-hidden px-4 py-16 sm:py-24">
        <div className="glow-orb left-1/2 top-0 h-64 w-[30rem] -translate-x-1/2 opacity-50" />
        <div className="glass relative mx-auto w-full max-w-md rounded-2xl p-7 sm:p-8">
          <span className="btn-glow grid size-10 place-items-center rounded-xl"><Sparkles className="size-5" /></span>
          <h1 className="mt-5 text-2xl font-semibold">{signup ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{signup ? "Save coins to a watchlist and set price alerts." : "Sign in to see your watchlist and alerts."}</p>

          <button onClick={google} type="button" className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-white/12 bg-white/[0.04] py-3 text-sm font-medium transition hover:border-white/30">
            <svg viewBox="0 0 24 24" className="size-4"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9a6 6 0 0 1 0-12c1.9 0 3.1.8 3.8 1.5l2.6-2.5A9.6 9.6 0 0 0 12 2.3a9.7 9.7 0 0 0 0 19.4c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6z"/></svg>
            Continue with Google
          </button>
          <div className="my-5 flex items-center gap-3 text-xs text-dim"><span className="h-px flex-1 bg-white/10" />or with email<span className="h-px flex-1 bg-white/10" /></div>

          <form onSubmit={submit} className="space-y-3">
            {signup && <input className={input} aria-label="Name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
            <input className={input} type="email" required aria-label="Email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <input className={input} type="password" required minLength={8} aria-label="Password" placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={signup ? "new-password" : "current-password"} />
            {err && <p className="rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss">{err}</p>}
            <button disabled={busy} className="btn-glow w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-60">{busy ? "Please wait…" : signup ? "Create account" : "Sign in"}</button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {signup ? "Already have an account? " : "New here? "}
            <Link to={signup ? "/sign-in" : "/sign-up"} className="font-medium text-brand-soft hover:underline">{signup ? "Sign in" : "Create an account"}</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
