"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Check, ChevronDown, Copy, FileText, Layers2, LogOut, Menu, Plus, Search, Settings2, Share2, Sparkles, Trash2, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import AuthScreen, { Logo } from "./AuthScreen";
import FormBuilder from "./FormBuilder";
import Responses from "./Responses";
import { loadDemo, saveDemo } from "@/lib/demo";
import { newForm } from "@/lib/form";
import { supabaseBrowser } from "@/lib/supabase";
import type { FormRecord, Workspace } from "@/lib/types";

type View = "forms" | "builder" | "responses" | "settings";

export default function Dashboard() {
  const client = useMemo(() => supabaseBrowser(), []);
  const [initializing, setInitializing] = useState(() => Boolean(supabaseBrowser()));
  const [demo, setDemo] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [view, setView] = useState<View>("forms");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!client) return;
    client.auth.getUser().then(({ data }) => { setUser(data.user); setInitializing(false); });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) { setWorkspaces([]); setForms([]); setWorkspaceId(""); }
    });
    return () => data.subscription.unsubscribe();
  }, [client]);
  useEffect(() => {
    if (!user || demo || !client) return;
    client.from("workspaces").select("*").order("created_at").then(({ data, error }) => {
      if (error) { setNotice(error.message); return; }
      const list = (data ?? []) as Workspace[];
      setWorkspaces(list);
      setWorkspaceId((previous) => list.some((item) => item.id === previous) ? previous : list[0]?.id ?? "");
    });
  }, [user, demo, client]);
  useEffect(() => {
    if (!workspaceId || demo || !client) return;
    client.from("forms").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }).then(({ data, error }) => {
      if (error) setNotice(error.message); else setForms((data ?? []) as FormRecord[]);
    });
  }, [workspaceId, demo, client]);
  useEffect(() => { if (demo && workspaces.length) saveDemo({ workspaces, forms }); }, [demo, workspaces, forms]);

  const currentWorkspace = workspaces.find((item) => item.id === workspaceId);
  const selected = forms.find((item) => item.id === selectedId);
  const visibleForms = forms.filter((item) => item.workspace_id === workspaceId && item.title.toLowerCase().includes(search.toLowerCase()));

  function enterDemo() {
    const data = loadDemo(); setDemo(true); setWorkspaces(data.workspaces); setForms(data.forms); setWorkspaceId(data.workspaces[0]?.id ?? ""); setView("forms");
  }
  async function leave() {
    if (demo) { setDemo(false); setWorkspaces([]); setForms([]); setWorkspaceId(""); setView("forms"); }
    else await client?.auth.signOut();
  }
  async function createWorkspace() {
    const name = window.prompt("Name your workspace");
    if (!name?.trim()) return;
    if (demo) {
      const workspace: Workspace = { id: crypto.randomUUID(), name: name.trim(), created_by: "demo", created_at: new Date().toISOString() };
      setWorkspaces((items) => [...items, workspace]); setWorkspaceId(workspace.id); setView("forms"); return;
    }
    if (!client || !user) return;
    const { data, error } = await client.from("workspaces").insert({ name: name.trim(), created_by: user.id }).select("*").single();
    if (error) setNotice(error.message); else { setWorkspaces((items) => [...items, data as Workspace]); setWorkspaceId(data.id); setView("forms"); }
  }
  async function createForm() {
    if (!workspaceId) { setNotice("Create a workspace first."); return; }
    const form = newForm(workspaceId);
    if (!demo && client) {
      const { error } = await client.from("forms").insert(form);
      if (error) { setNotice(error.message); return; }
    }
    setForms((items) => [form, ...items]); setSelectedId(form.id); setView("builder");
  }
  async function saveForm(form: FormRecord) {
    const updated = { ...form, updated_at: new Date().toISOString() };
    if (!demo && client) {
      const { error } = await client.from("forms").update({ title: updated.title, description: updated.description, status: updated.status, fields: updated.fields, theme: updated.theme, thank_you: updated.thank_you }).eq("id", updated.id).select("id").single();
      if (error) { setNotice(error.message); return false; }
    }
    setForms((items) => items.map((item) => item.id === updated.id ? updated : item)); setNotice("Saved"); return true;
  }
  async function deleteForm(form: FormRecord) {
    if (!window.confirm(`Delete “${form.title}” and all its responses? This cannot be undone.`)) return;
    if (!demo && client) { const { error } = await client.from("forms").delete().eq("id", form.id); if (error) { setNotice(error.message); return; } }
    setForms((items) => items.filter((item) => item.id !== form.id)); setView("forms"); setSelectedId("");
  }
  async function duplicateForm(form: FormRecord) {
    const copy = { ...structuredClone(form), id: crypto.randomUUID(), title: `${form.title} (copy)`, status: "draft" as const, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (!demo && client) { const { error } = await client.from("forms").insert(copy); if (error) { setNotice(error.message); return; } }
    setForms((items) => [copy, ...items]); setSelectedId(copy.id); setView("builder");
  }
  async function copyLink(form: FormRecord) {
    await navigator.clipboard.writeText(`${window.location.origin}/f/${form.id}`); setNotice("Form link copied");
  }
  if (initializing) return <div className="loading-screen"><Logo /><span>Loading your workspace...</span></div>;
  if (!demo && !user) return <AuthScreen onDemo={enterDemo} />;
  return <div className="app-shell">
    {sidebarOpen && <div className="mobile-scrim" onClick={() => setSidebarOpen(false)} />}
    <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}><div className="sidebar-top"><Logo /><button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={18} /></button></div><div className="workspace-picker"><span className="workspace-avatar">{currentWorkspace?.name.slice(0, 1).toUpperCase() ?? "W"}</span><select aria-label="Select workspace" value={workspaceId} onChange={(event) => { setWorkspaceId(event.target.value); setView("forms"); }}><option value="" disabled>{workspaces.length ? "Select workspace" : "No workspace"}</option>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select><ChevronDown size={15} /></div><nav className="nav"><button className={view === "forms" ? "nav-active" : ""} onClick={() => { setView("forms"); setSidebarOpen(false); }}><Layers2 size={18} /> Forms</button><button className={view === "responses" ? "nav-active" : ""} onClick={() => { setView("responses"); setSidebarOpen(false); }}><BarChart3 size={18} /> Responses</button><button className={view === "settings" ? "nav-active" : ""} onClick={() => { setView("settings"); setSidebarOpen(false); }}><Settings2 size={18} /> Settings</button></nav><div className="sidebar-bottom">{demo && <div className="demo-card"><Sparkles size={19} /><strong>You’re in demo mode</strong><p>Explore freely. Your forms stay in this browser until you create an account.</p><button onClick={leave}>Create an account <ArrowRight size={15} /></button></div>}<button className="profile-button" onClick={leave}><span className="profile-avatar">{demo ? "D" : user?.email?.slice(0, 1).toUpperCase()}</span><span><strong>{demo ? "Demo explorer" : user?.email?.split("@")[0]}</strong><small>{demo ? "Local workspace" : user?.email}</small></span><LogOut size={17} /></button></div></aside>
    <main className="main-content"><header className="main-header"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={21} /></button><div className="breadcrumbs"><span>{currentWorkspace?.name ?? "Workspace"}</span><span>/</span><strong>{view === "builder" ? selected?.title : view === "responses" ? "Responses" : view === "settings" ? "Settings" : "Forms"}</strong></div><div className="header-right"><span>Made for better questions</span><span className="header-avatar">{demo ? "D" : user?.email?.slice(0, 1).toUpperCase()}</span></div></header>
      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X size={15} /></button></div>}
      {!workspaceId ? <div className="empty-workspace"><div className="empty-illustration"><Layers2 size={34} /></div><h1>Make space for good questions</h1><p>Create a workspace to keep your forms together.</p><button className="primary-button" onClick={createWorkspace}><Plus size={18} /> Create workspace</button></div> : view === "builder" && selected ? <FormBuilder key={selected.id} form={selected} demo={demo} onSave={saveForm} onBack={() => setView("forms")} onResponses={() => setView("responses")} onNotice={setNotice} /> : view === "responses" ? <Responses forms={forms.filter((item) => item.workspace_id === workspaceId)} selectedId={selectedId} onSelect={setSelectedId} demo={demo} onCopy={copyLink} /> : view === "settings" ? <div className="page-wrap settings-page"><div className="eyebrow">PREFERENCES</div><h1>Settings</h1><p>Keep your workspace tidy and easy to find.</p><div className="settings-card"><div><h2>Workspaces</h2><p>Forms in each workspace are isolated from the others.</p></div><button className="secondary-button" onClick={createWorkspace}><Plus size={17} /> New workspace</button></div><div className="workspace-list">{workspaces.map((workspace) => <button key={workspace.id} className={`workspace-item ${workspace.id === workspaceId ? "selected" : ""}`} onClick={() => { setWorkspaceId(workspace.id); setView("forms"); }}><span className="workspace-avatar">{workspace.name.slice(0, 1).toUpperCase()}</span><span>{workspace.name}</span>{workspace.id === workspaceId && <Check size={18} />}</button>)}</div><div className="settings-card"><div><h2>Account</h2><p>{demo ? "Demo data is saved only in this browser." : user?.email}</p></div><button className="secondary-button" onClick={leave}>{demo ? "Leave demo" : "Sign out"}</button></div></div> : <div className="page-wrap"><div className="page-heading"><div><div className="eyebrow">YOUR WORKSPACE</div><h1>Forms</h1><p>Create something people will enjoy answering.</p></div><button className="primary-button" onClick={createForm}><Plus size={18} /> Create form</button></div><div className="summary-row"><div className="summary-card"><span className="summary-icon green"><FileText size={20} /></span><div><strong>{visibleForms.length}</strong><span>Total forms</span></div></div><div className="summary-card"><span className="summary-icon purple"><Share2 size={20} /></span><div><strong>{visibleForms.filter((form) => form.status === "published").length}</strong><span>Published</span></div></div><div className="summary-card hint-card"><Sparkles size={19} /><span>Keep it simple. Ask only what you need to know.</span></div></div><div className="list-toolbar"><div><h2>All forms</h2><span>{visibleForms.length} {visibleForms.length === 1 ? "form" : "forms"}</span></div><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search forms" /></label></div>{visibleForms.length ? <div className="form-list">{visibleForms.map((form) => <div className="form-list-item" key={form.id}><span className="list-form-icon" style={{ background: form.theme.background, color: form.theme.accent }}><FileText size={22} /></span><div className="list-form-main"><button onClick={() => { setSelectedId(form.id); setView("builder"); }}>{form.title}</button><span>Updated {new Date(form.updated_at).toLocaleDateString()} · {form.fields.length} questions</span></div><span className={`status-badge ${form.status}`}>{form.status === "published" ? "Published" : "Draft"}</span><div className="list-actions"><button title="Responses" aria-label={`Responses for ${form.title}`} onClick={() => { setSelectedId(form.id); setView("responses"); }}><BarChart3 size={18} /></button><button title="Duplicate" aria-label={`Duplicate ${form.title}`} onClick={() => void duplicateForm(form)}><Copy size={17} /></button><button title="Delete" aria-label={`Delete ${form.title}`} onClick={() => void deleteForm(form)}><Trash2 size={17} /></button><button title="Edit" aria-label={`Edit ${form.title}`} onClick={() => { setSelectedId(form.id); setView("builder"); }}><ArrowRight size={18} /></button></div></div>)}</div> : <div className="empty-list"><div className="empty-illustration"><FileText size={33} /></div><h3>{search ? "No forms found" : "Your first form starts here"}</h3><p>{search ? "Try a different search term." : "Create a form, add questions, and make it yours."}</p>{!search && <button className="primary-button" onClick={createForm}><Plus size={17} /> Create form</button>}</div>}</div>}
    </main>
  </div>;
}
