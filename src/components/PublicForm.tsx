"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, Sparkles } from "lucide-react";
import type { FormField, FormRecord } from "@/lib/types";

type Value = string | string[] | number | boolean | File[];

function QuestionInput({ field, value, onChange }: { field: FormField; value: Value | undefined; onChange: (value: Value) => void }) {
  const text = typeof value === "string" ? value : "";
  const options = field.options ?? [];
  if (field.type === "long_text" || field.type === "address") {
    return <textarea className="answer-input answer-textarea" rows={field.type === "address" ? 4 : 5} placeholder={field.type === "address" ? "Street, city, postal code, country" : "Type your answer here..."} value={text} onChange={(event) => onChange(event.target.value)} />;
  }
  if (field.type === "dropdown") {
    return <select className="answer-input" value={text} onChange={(event) => onChange(event.target.value)}><option value="">Select an option</option>{options.map((option, index) => <option key={`${option}-${index}`} value={option}>{option}</option>)}</select>;
  }
  if (field.type === "multiple_choice" || field.type === "yes_no") {
    return <div className="choice-grid">{(field.type === "yes_no" ? ["Yes", "No"] : options).map((option, index) => <button key={`${option}-${index}`} type="button" className={`choice ${text === option ? "choice-selected" : ""}`} onClick={() => onChange(option)}><span className="choice-key">{String.fromCharCode(65 + index)}</span>{option}{text === option && <Check size={17} />}</button>)}</div>;
  }
  if (field.type === "checkboxes") {
    const selected = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
    return <div className="choice-grid">{options.map((option, index) => <button key={`${option}-${index}`} type="button" className={`choice ${selected.includes(option) ? "choice-selected" : ""}`} onClick={() => onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option])}><span className="choice-key">{String.fromCharCode(65 + index)}</span>{option}{selected.includes(option) && <Check size={17} />}</button>)}</div>;
  }
  if (field.type === "rating" || field.type === "opinion_scale") {
    const count = field.type === "rating" ? 5 : 10;
    return <div className="scale-grid">{Array.from({ length: count }, (_, index) => index + 1).map((number) => <button className={`scale-button ${value === number ? "scale-selected" : ""}`} type="button" key={number} onClick={() => onChange(number)}>{field.type === "rating" ? "★" : number}</button>)}</div>;
  }
  if (field.type === "file") {
    const files = Array.isArray(value) ? value.filter((item): item is File => item instanceof File) : [];
    return <label className="upload-zone"><input type="file" multiple={(field.maxFiles ?? 1) > 1} onChange={(event) => onChange(Array.from(event.target.files ?? []))} /><span className="upload-icon">↑</span><strong>Choose {field.maxFiles && field.maxFiles > 1 ? "files" : "a file"}</strong><span>{files.length ? files.map((file) => file.name).join(", ") : `PDF, image or document · max 10 MB each${(field.maxFiles ?? 1) > 1 ? ` · up to ${field.maxFiles}` : ""}`}</span></label>;
  }
  if (field.type === "consent") return <label className="consent-row"><input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} /><span>I agree</span></label>;
  const inputType = field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "website" ? "url" : field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "time" ? "time" : "text";
  return <input className="answer-input" type={inputType} placeholder={field.type === "email" ? "name@example.com" : field.type === "name" ? "Your name" : field.type === "website" ? "https://example.com" : "Type your answer here..."} value={text} onChange={(event) => onChange(event.target.value)} />;
}

function validAnswer(field: FormField, value: Value | undefined) {
  if (!field.required) return true;
  if (field.type === "consent") return value === true;
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

export default function PublicForm({ form, preview = false, onClose }: { form: FormRecord; preview?: boolean; onClose?: () => void }) {
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, Value>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const field = form.fields[step];
  const total = form.fields.length;
  const isLast = step === total - 1;
  const advance = async () => {
    setError("");
    if (field && !validAnswer(field, answers[field.id])) { setError("Please answer this question before continuing."); return; }
    if (!isLast) { setStep(step + 1); contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (preview) { setComplete(true); return; }
    setBusy(true);
    try {
      const payload = new FormData();
      const textAnswers: Record<string, unknown> = {};
      for (const question of form.fields) {
        const answer = answers[question.id];
        if (question.type === "file") {
          const files = Array.isArray(answer) ? answer.filter((item): item is File => item instanceof File) : [];
          files.forEach((file) => payload.append(`file:${question.id}`, file));
        } else if (answer !== undefined) textAnswers[question.id] = answer;
      }
      payload.append("answers", JSON.stringify(textAnswers));
      const response = await fetch(`/api/submit/${form.id}`, { method: "POST", body: payload });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not submit your response.");
      setComplete(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not submit your response."); }
    finally { setBusy(false); }
  };
  const theme = form.theme;
  return <div className="form-experience" onKeyDown={(event) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || step < 0 || complete || busy) return;
    const target = event.target as HTMLElement;
    if (target.tagName !== "INPUT" && target.tagName !== "SELECT") return;
    if (target instanceof HTMLInputElement && (target.type === "file" || target.type === "checkbox")) return;
    event.preventDefault(); void advance();
  }} style={{ background: theme.background, color: theme.foreground, "--form-accent": theme.accent, "--form-card": theme.card, "--form-radius": `${theme.radius}px` } as React.CSSProperties}>
    <div className="form-topbar"><div className="form-brand"><span className="brand-mark small-mark">r</span><span>risoform</span></div>{onClose ? <button className="icon-button" type="button" onClick={onClose} aria-label="Close preview">×</button> : <span className="form-powered">Made with risoform</span>}</div>
    <div ref={contentRef} className="form-stage">
      {complete ? <div className="form-card complete-card"><span className="complete-icon"><Check size={28} /></span><h1>{form.thank_you}</h1><p>{preview ? "This is a preview. No response was saved." : "Your response has been recorded."}</p>{preview && <button type="button" className="primary-button" onClick={() => { setComplete(false); setStep(-1); setAnswers({}); }}>Start again</button>}</div> : step === -1 ? <div className="form-card welcome-card"><div className="eyebrow"><Sparkles size={15} /> A thoughtful little form</div><h1>{form.title}</h1>{form.description && <p>{form.description}</p>}<button type="button" className="form-cta" onClick={() => setStep(0)}>Start <ArrowRight size={19} /></button><small>{total} {total === 1 ? "question" : "questions"} · takes a moment</small></div> : <div className="form-card question-card"><div className="question-count">{step + 1} <ArrowRight size={14} /></div><h1>{field.title}{field.required && <span className="required-star"> *</span>}</h1>{field.description && <p>{field.description}</p>}<QuestionInput field={field} value={answers[field.id]} onChange={(value) => { setAnswers((current) => ({ ...current, [field.id]: value })); setError(""); }} />{error && <div className="form-error" role="alert">{error}</div>}<div className="form-actions"><button type="button" className="form-cta" disabled={busy} onClick={advance}>{busy ? <LoaderCircle className="spin" size={18} /> : isLast ? "Submit" : "OK"}{!busy && <ArrowRight size={18} />}</button><span>press Enter ↵</span></div></div>}
    </div>
    {!complete && step >= 0 && <div className="form-footer"><div className="progress-track"><div style={{ width: `${((step + 1) / total) * 100}%`, background: theme.accent }} /></div><span>{Math.round(((step + 1) / total) * 100)}% complete</span><div className="step-controls"><button type="button" aria-label="Previous question" onClick={() => setStep(Math.max(-1, step - 1))}><ArrowLeft size={18} /></button><button type="button" aria-label="Next question" onClick={advance}><ArrowRight size={18} /></button></div></div>}
  </div>;
}
