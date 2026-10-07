import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { FormField, FormRecord } from "@/lib/types";

export const runtime = "nodejs";

const maxFileBytes = 10 * 1024 * 1024;
const maxRequestBytes = 30 * 1024 * 1024;
const acceptedMime = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain", "text/csv", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
const limits = new Map<string, { count: number; reset: number }>();

function invalid(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
function isPresent(value: unknown) { return value !== undefined && value !== null && (typeof value !== "string" || value.trim() !== "") && (!Array.isArray(value) || value.length > 0); }

function validate(field: FormField, answer: unknown): string | null {
  if (!isPresent(answer)) return field.required ? `Please answer “${field.title}”.` : null;
  if (field.type === "file") return null;
  if (field.type === "consent") return answer === true ? null : `Please accept “${field.title}”.`;
  if (field.type === "checkboxes") return Array.isArray(answer) && answer.length <= 50 && answer.every((item) => typeof item === "string" && field.options?.includes(item)) ? null : `Invalid answer for “${field.title}”.`;
  if (field.type === "rating" || field.type === "opinion_scale") return typeof answer === "number" && Number.isInteger(answer) && answer >= 1 && answer <= (field.type === "rating" ? 5 : 10) ? null : `Invalid answer for “${field.title}”.`;
  if (typeof answer !== "string" || answer.length > 5000) return `Invalid answer for “${field.title}”.`;
  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)) return "Enter a valid email address.";
  if (field.type === "website") { try { const url = new URL(answer); if (!["http:", "https:"].includes(url.protocol)) return "Enter a valid website URL."; } catch { return "Enter a valid website URL."; } }
  if (field.type === "number" && (!Number.isFinite(Number(answer)) || answer.trim() === "")) return "Enter a valid number.";
  if ((field.type === "dropdown" || field.type === "multiple_choice") && !field.options?.includes(answer)) return `Invalid answer for “${field.title}”.`;
  if (field.type === "yes_no" && answer !== "Yes" && answer !== "No") return `Invalid answer for “${field.title}”.`;
  return null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return invalid("Form not found.", 404);
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxRequestBytes) return invalid("Upload is too large.", 413);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now(); const current = limits.get(ip);
  if (current && current.reset > now && current.count >= 20) return invalid("Too many submissions. Please try again later.", 429);
  limits.set(ip, current && current.reset > now ? { ...current, count: current.count + 1 } : { count: 1, reset: now + 60 * 60 * 1000 });
  if (limits.size > 10000) for (const [key, value] of limits) if (value.reset < now) limits.delete(key);
  let payload: FormData;
  try { payload = await request.formData(); } catch { return invalid("Could not read the submission."); }
  if (payload.get("website_check")) return NextResponse.json({ ok: true });
  let supplied: Record<string, unknown>;
  try { const value = JSON.parse(String(payload.get("answers") ?? "{}")); if (!value || Array.isArray(value) || typeof value !== "object") throw Error(); supplied = value; }
  catch { return invalid("Invalid answers."); }
  const admin = supabaseAdmin();
  const { data, error } = await admin.from("forms").select("*").eq("id", id).eq("status", "published").single();
  if (error || !data) return invalid("Form not found.", 404);
  const form = data as FormRecord;
  const allowed = new Set(form.fields.map((field) => field.id));
  if (Object.keys(supplied).some((key) => !allowed.has(key))) return invalid("Submission contains unknown answers.");
  const answers: Record<string, unknown> = {};
  const attachments: { fieldId: string; file: File }[] = [];
  for (const field of form.fields) {
    if (field.type === "file") {
      const files = payload.getAll(`file:${field.id}`).filter((item): item is File => item instanceof File);
      if (field.required && !files.length) return invalid(`Please upload a file for “${field.title}”.`);
      if (files.length > (field.maxFiles ?? 1) || files.length > 5) return invalid("Too many files.");
      for (const file of files) {
        if (file.size > maxFileBytes || !acceptedMime.has(file.type)) return invalid("Only PDF, image, text, CSV, Word and Excel files up to 10 MB are supported.");
        attachments.push({ fieldId: field.id, file });
      }
      continue;
    }
    const answer = supplied[field.id]; const problem = validate(field, answer);
    if (problem) return invalid(problem);
    if (answer !== undefined) answers[field.id] = answer;
  }
  if ([...payload.keys()].some((key) => key.startsWith("file:") && !allowed.has(key.slice(5)))) return invalid("Unknown upload field.");
  const responseId = crypto.randomUUID();
  const uploaded: string[] = [];
  for (const { fieldId, file } of attachments) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "file";
    const path = `${form.workspace_id}/${form.id}/${responseId}/${fieldId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await admin.storage.from("response-files").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) { if (uploaded.length) await admin.storage.from("response-files").remove(uploaded); return invalid("Could not upload the file. Please try again.", 500); }
    uploaded.push(path);
    const list = (answers[fieldId] as { name: string; path: string; size: number; type: string }[] | undefined) ?? [];
    list.push({ name: file.name, path, size: file.size, type: file.type }); answers[fieldId] = list;
  }
  const fieldSnapshot = form.fields.map(({ id, title, type }) => ({ id, title, type }));
  const { error: insertError } = await admin.from("responses").insert({ id: responseId, form_id: form.id, workspace_id: form.workspace_id, answers, field_snapshot: fieldSnapshot });
  if (insertError) { if (uploaded.length) await admin.storage.from("response-files").remove(uploaded); return invalid("Could not save the response. Please try again.", 500); }
  return NextResponse.json({ ok: true });
}
