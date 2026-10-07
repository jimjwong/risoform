import { newForm } from "./form";
import type { FormRecord, Workspace } from "./types";

const storageKey = "risoform-demo-v1";
type DemoData = { workspaces: Workspace[]; forms: FormRecord[] };

export function loadDemo(): DemoData {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) return JSON.parse(saved) as DemoData;
  } catch { /* Start a fresh demo if browser storage is unavailable. */ }
  const workspace: Workspace = { id: crypto.randomUUID(), name: "Demo workspace", created_by: "demo", created_at: new Date().toISOString() };
  const sample = newForm(workspace.id);
  sample.title = "A little introduction";
  sample.description = "A simple way to get to know someone.";
  sample.fields[0].title = "What should we call you?";
  return { workspaces: [workspace], forms: [sample] };
}

export function saveDemo(data: DemoData) {
  try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch { /* Demo still works for this tab. */ }
}
