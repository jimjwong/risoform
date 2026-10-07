"use client";

import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";

export function Logo() {
  return <div className="logo"><span className="brand-mark">r</span><span>risoform<span className="logo-dot">.</span></span></div>;
}

export default function AuthScreen({ onDemo }: { onDemo: () => void }) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const client = supabaseBrowser();
    if (!client) { setMessage("Supabase is not connected yet. Try the demo workspace."); return; }
    setBusy(true); setMessage("");
    const result = mode === "signup"
      ? await client.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      : await client.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup" && !result.data.session) setMessage("Check your email for a confirmation link, then sign in.");
  }
  return <div className="auth-shell">
    <section className="auth-left"><div className="auth-header"><Logo /><span>Forms that feel like a conversation.</span></div><div className="auth-story"><div className="eyebrow"><Sparkles size={15} /> A BETTER WAY TO ASK</div><h1>Good questions.<br /><em>Great answers.</em></h1><p>Create beautiful forms in minutes. Collect responses that matter. Keep everything simple.</p><div className="sample-card"><div className="sample-count">01 <ArrowRight size={16} /></div><h2>What would make your day easier?</h2><div className="sample-answer">Type your answer here...</div><div className="sample-line"><span /></div></div><small>Thoughtful forms for every kind of conversation.</small></div></section>
    <section className="auth-right"><div className="auth-mobile-logo"><Logo /></div><div className="auth-panel"><div className="pill">YOUR WORKSPACE STARTS HERE</div><h2>{mode === "signup" ? "Let's get started" : "Welcome back"}</h2><p>{mode === "signup" ? "Make your first form in a few clicks." : "Sign in to manage your forms."}</p><form className="auth-form" onSubmit={submit}><label>Email address<input type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} placeholder="At least 6 characters" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{message && <div className="inline-notice" role="status">{message}</div>}<button className="primary-button full-width" disabled={busy}>{busy ? "One moment..." : mode === "signup" ? "Create account" : "Sign in"}<ArrowRight size={17} /></button></form><div className="divider"><span>or</span></div><button className="secondary-button full-width" type="button" onClick={onDemo}><Sparkles size={17} /> Try the demo workspace</button><div className="auth-switch">{mode === "signup" ? "Already have an account?" : "New to risoform?"} <button type="button" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMessage(""); }}>{mode === "signup" ? "Sign in" : "Create account"}</button></div><div className="auth-later">Google sign in is planned for a later release.</div></div></section>
  </div>;
}
