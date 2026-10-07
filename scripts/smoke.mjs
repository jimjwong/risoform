import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
const app = process.env.RISOFORM_APP_URL ?? "http://127.0.0.1:3101";
if (!url || !publishable || !secret || !url.startsWith("http://127.0.0.1:") || !app.startsWith("http://127.0.0.1:")) {
  throw Error("Smoke check requires local Supabase and app URLs.");
}
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } });
const a = createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } });
const b = createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } });
const password = `Test-${randomUUID()}!`;
const users = [];
const uploaded = [];
function noError(result) { assert.ifError(result.error); return result.data; }

try {
  const aAuth = noError(await a.auth.signUp({ email: `risoform-a-${randomUUID()}@example.test`, password }));
  const aUser = aAuth.user;
  const bUser = noError(await b.auth.signUp({ email: `risoform-b-${randomUUID()}@example.test`, password })).user;
  assert(aUser && bUser);
  const ideaRequest = JSON.stringify({ prompt: "Create a customer feedback form with rating and comments." });
  const anonymousAi = await fetch(`${app}/api/ai/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: ideaRequest });
  assert.equal(anonymousAi.status, 401);
  if (!process.env.OPENAI_API_KEY) {
    assert(aAuth.session?.access_token);
    const withoutProvider = await fetch(`${app}/api/ai/generate`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${aAuth.session.access_token}` }, body: ideaRequest });
    assert.equal(withoutProvider.status, 503);
  }
  users.push(aUser.id, bUser.id);
  const workspace = noError(await a.from("workspaces").insert({ name: "Smoke workspace", created_by: aUser.id }).select().single());
  const formId = randomUUID();
  const fields = [
    { id: randomUUID(), type: "short_text", title: "Your note", required: true },
    { id: randomUUID(), type: "file", title: "Attachment", required: true, maxFiles: 1 },
  ];
  const form = { id: formId, workspace_id: workspace.id, title: "Smoke form", description: "", status: "draft", fields, theme: { preset: "minimal", background: "#ffffff", foreground: "#222222", accent: "#336644", card: "#ffffff", radius: 18 }, thank_you: "Thanks" };
  noError(await a.from("forms").insert(form));
  assert.equal((noError(await b.from("workspaces").select("id")).length), 0);
  assert.equal((noError(await b.from("forms").select("id").eq("id", formId)).length), 0);
  assert.equal((noError(await anon.from("forms").select("id").eq("id", formId)).length), 0);
  const forbidden = await b.from("forms").update({ title: "Hijacked" }).eq("id", formId).select();
  assert.equal(forbidden.data?.length, 0);
  noError(await a.from("forms").update({ status: "published" }).eq("id", formId));
  assert.equal((noError(await anon.from("forms").select("id").eq("id", formId)).length), 1);
  const publicForm = await fetch(`${app}/f/${formId}`);
  assert.equal(publicForm.status, 200);
  const payload = new FormData();
  payload.set("answers", JSON.stringify({ [fields[0].id]: "Hello from smoke check" }));
  payload.append(`file:${fields[1].id}`, new File(["test attachment"], "smoke.txt", { type: "text/plain" }));
  const submission = await fetch(`${app}/api/submit/${formId}`, { method: "POST", body: payload });
  assert.equal(submission.status, 200, await submission.text());
  const response = noError(await a.from("responses").select("*").eq("form_id", formId).single());
  assert.equal(response.answers[fields[0].id], "Hello from smoke check");
  assert.equal(response.field_snapshot[0].title, "Your note");
  const path = response.answers[fields[1].id][0].path;
  uploaded.push(path);
  assert.equal((noError(await b.from("responses").select("id").eq("form_id", formId)).length), 0);
  const ownerLink = await a.storage.from("response-files").createSignedUrl(path, 60);
  if (ownerLink.error) {
    const adminLink = await admin.storage.from("response-files").createSignedUrl(path, 60);
    console.log("Signed URL diagnostics:", { owner: ownerLink.error.message, admin: adminLink.error?.message ?? "ok", path });
  }
  assert.ifError(ownerLink.error);
  const strangerLink = await b.storage.from("response-files").createSignedUrl(path, 60);
  assert(strangerLink.error);
  noError(await a.from("forms").update({ status: "draft" }).eq("id", formId));
  const closedForm = await fetch(`${app}/f/${formId}`);
  assert.equal(closedForm.status, 404);
  console.log("Smoke check passed: ownership, publishing, submission, file access, and unpublishing.");
} finally {
  if (uploaded.length) await admin.storage.from("response-files").remove(uploaded);
  for (const userId of users) await admin.auth.admin.deleteUser(userId);
}
