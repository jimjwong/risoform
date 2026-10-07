"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Copy, Download } from "lucide-react";
import { answerToText } from "@/lib/form";
import { supabaseBrowser } from "@/lib/supabase";
import type { FormRecord, ResponseRecord } from "@/lib/types";

export default function Responses({ forms, selectedId, onSelect, demo, onCopy }: { forms: FormRecord[]; selectedId: string; onSelect: (id: string) => void; demo: boolean; onCopy: (form: FormRecord) => void }) {
  const client = useMemo(() => supabaseBrowser(), []);
  const [responses, setResponses] = useState<ResponseRecord[]>([]);
  const [loadedId, setLoadedId] = useState("");
  const [error, setError] = useState("");
  const selected = forms.find((form) => form.id === selectedId);
  const formId = selected?.id ?? "";
  const loading = Boolean(formId && !demo && client && loadedId !== formId);
  const visibleResponses = responses.filter((response) => response.form_id === formId);
  useEffect(() => {
    if (!formId || demo || !client) return;
    let active = true;
    client.from("responses").select("id,form_id,answers,field_snapshot,submitted_at").eq("form_id", formId).order("submitted_at", { ascending: false }).then(({ data, error }) => {
      if (!active) return;
      setLoadedId(formId);
      if (error) setError(error.message); else { setResponses((data ?? []) as ResponseRecord[]); setError(""); }
    });
    return () => { active = false; };
  }, [formId, demo, client]);
  const columns = new Map<string, { title: string; type: string }>();
  for (const response of visibleResponses) for (const field of response.field_snapshot ?? []) {
    const previous = columns.get(field.id);
    columns.set(field.id, { title: previous && previous.title !== field.title ? `${previous.title} / ${field.title}` : field.title, type: field.type });
  }
  for (const field of selected?.fields ?? []) if (!columns.has(field.id)) columns.set(field.id, { title: field.title, type: field.type });
  const columnList = [...columns.entries()];
  function exportCsv() {
    if (!selected) return;
    const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const rows = [["Submitted at", ...columnList.map(([, field]) => field.title)], ...visibleResponses.map((response) => [response.submitted_at, ...columnList.map(([id]) => answerToText(response.answers[id]))])];
    const csv = rows.map((row) => row.map(quote).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `${selected.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-responses.csv`; link.click(); URL.revokeObjectURL(url);
  }
  return <div className="page-wrap"><div className="page-heading"><div><div className="eyebrow">YOUR ANSWERS</div><h1>Responses</h1><p>See what people shared with you.</p></div>{selected && <button className="secondary-button" onClick={exportCsv} disabled={!visibleResponses.length}><Download size={17} /> Export CSV</button>}</div><div className="response-selector"><label>Form <select value={selectedId} onChange={(event) => onSelect(event.target.value)}><option value="">Choose a form</option>{forms.map((form) => <option key={form.id} value={form.id}>{form.title}</option>)}</select></label>{selected && <span>{visibleResponses.length} responses</span>}</div>{error && <div className="inline-notice">{error}</div>}{!selected ? <div className="empty-list"><BarChart3 size={32} /><h3>Choose a form to see its responses</h3></div> : loading ? <div className="empty-list">Loading responses...</div> : visibleResponses.length ? <div className="responses-table-wrap"><table className="responses-table"><thead><tr><th>Submitted</th>{columnList.map(([id, field]) => <th key={id}>{field.title}</th>)}</tr></thead><tbody>{visibleResponses.map((response) => <tr key={response.id}><td>{new Date(response.submitted_at).toLocaleString()}</td>{columnList.map(([id, field]) => <td key={id}>{field.type !== "file" ? answerToText(response.answers[id]) || "—" : <FileLinks answer={response.answers[id]} />}</td>)}</tr>)}</tbody></table></div> : <div className="empty-list"><div className="empty-illustration"><BarChart3 size={31} /></div><h3>No responses yet</h3><p>{demo ? "Demo forms do not collect live responses." : "Share your form to start collecting answers."}</p>{selected.status === "published" && <button className="secondary-button" onClick={() => onCopy(selected)}><Copy size={16} /> Copy form link</button>}</div>}</div>;
}

function FileLinks({ answer }: { answer: unknown }) {
  const client = useMemo(() => supabaseBrowser(), []);
  const [links, setLinks] = useState<{ name: string; url: string }[]>([]);
  const files = Array.isArray(answer) ? answer.filter((item): item is { name: string; path: string } => item && typeof item === "object" && typeof item.name === "string" && typeof item.path === "string") : [];
  if (!files.length) return <>—</>;
  return <div className="file-links">{links.length ? links.map((file) => <a key={file.url} href={file.url} target="_blank" rel="noreferrer">Open {file.name}</a>) : <button onClick={async () => { if (!client) return; const signed = await Promise.all(files.map(async (file) => { const { data } = await client.storage.from("response-files").createSignedUrl(file.path, 60); return data?.signedUrl ? { name: file.name, url: data.signedUrl } : null; })); setLinks(signed.filter((item): item is { name: string; url: string } => item !== null)); }}>Open {files.length} {files.length === 1 ? "file" : "files"}</button>}</div>;
}
