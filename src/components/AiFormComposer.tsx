"use client";

import { useState } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { demoIdeaFromDescription, normalizeFormIdea, type FormIdea } from "@/lib/ai-form";
import { supabaseBrowser } from "@/lib/supabase";

export default function AiFormComposer({ demo, onCreate }: { demo: boolean; onCreate: (idea: FormIdea) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (prompt.trim().length < 12) { setError("Add a little more detail about the form you want."); return; }
    setBusy(true); setError("");
    try {
      let idea: FormIdea;
      if (demo) {
        idea = demoIdeaFromDescription(prompt);
      } else {
        const client = supabaseBrowser();
        const { data: { session } } = await client!.auth.getSession();
        if (!session) throw Error("Sign in again to use AI form creation.");
        const response = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
          body: JSON.stringify({ prompt: prompt.trim() }),
        });
        const result = await response.json();
        if (!response.ok) throw Error(result.error || "Could not create the form.");
        const normalized = normalizeFormIdea(result.idea);
        if (!normalized) throw Error("The generated form was incomplete. Please try again.");
        idea = normalized;
      }
      if (await onCreate(idea)) { setOpen(false); setPrompt(""); }
      else setError("Could not save the form. Please try again.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not create the form."); }
    finally { setBusy(false); }
  }

  return <>
    <button className="secondary-button" type="button" onClick={() => { setError(""); setOpen(true); }}><Sparkles size={17} /> {demo ? "Describe a form" : "Create with AI"}</button>
    {open && <div className="composer-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <section className="composer-dialog" role="dialog" aria-modal="true" aria-labelledby="composer-title" onKeyDown={(event) => { if (event.key === "Escape" && !busy) setOpen(false); }}>
        <button className="icon-button composer-close" type="button" aria-label="Close" disabled={busy} onClick={() => setOpen(false)}><X size={19} /></button>
        <span className="pill">{demo ? "DEMO DRAFT" : "AI FORM BUILDER"}</span>
        <h2 id="composer-title">Tell us what you need</h2>
        <p>{demo ? "Try a sample draft based on your description. Signed-in accounts can use AI to tailor every question." : "Describe the audience, goal, and questions you have in mind. AI will make an editable draft."}</p>
        <form onSubmit={submit}>
          <label htmlFor="form-idea">Describe your form</label>
          <textarea id="form-idea" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={2000} rows={5} autoFocus placeholder="For example: A playful customer feedback form for our cafe. Ask for a rating, what they ordered, and suggestions." />
          <div className="composer-tip">{demo ? "This sample draft uses built-in field suggestions." : "Include your audience, goal, and must-have fields. Your description is sent to OpenAI to build the draft."}</div>
          {error && <div className="inline-notice" role="alert">{error}</div>}
          <div className="composer-actions"><button className="secondary-button" type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button><button className="primary-button" type="submit" disabled={busy}>{busy ? "Building your draft..." : demo ? "Make sample draft" : "Build my form"}<ArrowRight size={17} /></button></div>
        </form>
      </section>
    </div>}
  </>;
}
