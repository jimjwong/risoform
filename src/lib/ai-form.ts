import { fieldCatalog, isOptionType, presets } from "./form";
import type { FieldType, FormField, FormRecord, Theme } from "./types";

export type FormIdea = {
  title: string;
  description: string;
  preset: Theme["preset"];
  thank_you: string;
  fields: Omit<FormField, "id">[];
};

const fieldTypes = fieldCatalog.map((field) => field.type);
const presetNames = Object.keys(presets) as Theme["preset"][];

export const formIdeaSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    preset: { type: "string", enum: presetNames },
    thank_you: { type: "string" },
    fields: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: fieldTypes },
          title: { type: "string" },
          description: { type: "string" },
          required: { type: "boolean" },
          options: { type: "array", items: { type: "string" } },
          maxFiles: { type: "integer" },
        },
        required: ["type", "title", "description", "required", "options", "maxFiles"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "description", "preset", "thank_you", "fields"],
  additionalProperties: false,
} as const;

const cleanText = (value: unknown, limit: number) => typeof value === "string" ? value.trim().slice(0, limit) : "";

export function normalizeFormIdea(value: unknown): FormIdea | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const title = cleanText(input.title, 200);
  if (!title || !Array.isArray(input.fields) || !input.fields.length) return null;
  const fields: FormIdea["fields"] = [];
  for (const raw of input.fields.slice(0, 20)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    if (!fieldTypes.includes(item.type as FieldType)) continue;
    const type = item.type as FieldType;
    const question = cleanText(item.title, 200);
    if (!question) continue;
    const field: Omit<FormField, "id"> = {
      type,
      title: question,
      description: cleanText(item.description, 500),
      required: type === "consent" ? true : item.required === true,
    };
    if (isOptionType(type)) {
      const options = Array.isArray(item.options) ? [...new Set(item.options.map((option) => cleanText(option, 100)).filter(Boolean))].slice(0, 12) : [];
      field.options = options.length >= 2 ? options : ["Option 1", "Option 2"];
    }
    if (type === "file") field.maxFiles = Math.max(1, Math.min(5, Number.isInteger(item.maxFiles) ? Number(item.maxFiles) : 1));
    fields.push(field);
  }
  if (!fields.length) return null;
  const preset = presetNames.includes(input.preset as Theme["preset"]) ? input.preset as Theme["preset"] : "minimal";
  return {
    title,
    description: cleanText(input.description, 1000),
    preset,
    thank_you: cleanText(input.thank_you, 300) || "Thanks for sharing your thoughts!",
    fields,
  };
}

export function formFromIdea(workspaceId: string, idea: FormIdea): FormRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), workspace_id: workspaceId, title: idea.title,
    description: idea.description, status: "draft",
    fields: idea.fields.map((field) => ({ ...field, id: crypto.randomUUID() })),
    theme: presets[idea.preset], thank_you: idea.thank_you,
    created_at: now, updated_at: now,
  };
}

// A small local starter keeps the browser-only demo useful without claiming to call AI.
export function demoIdeaFromDescription(description: string): FormIdea {
  const prompt = description.trim();
  const lower = prompt.toLowerCase();
  const fields: FormIdea["fields"] = [];
  const add = (type: FieldType, title: string, required = true, options?: string[]) => {
    fields.push({ type, title, description: "", required, ...(options ? { options } : {}), ...(type === "file" ? { maxFiles: 1 } : {}) });
  };
  if (/\bname\b/.test(lower)) add("name", "What is your name?");
  if (/\bemail\b/.test(lower)) add("email", "What is your email address?");
  if (/\bphone|contact number\b/.test(lower)) add("phone", "What is your phone number?", false);
  if (/\bdate\b/.test(lower)) add("date", "Which date works for you?");
  if (/\btime\b/.test(lower)) add("time", "What time works for you?");
  if (/\bupload|attach|file\b/.test(lower)) add("file", "Please upload your file.");
  if (/\brate|rating|satisfaction|score\b/.test(lower)) add("rating", "How would you rate your experience?");
  if (/\brecommend|likely\b/.test(lower)) add("opinion_scale", "How likely are you to recommend us?");
  if (/\bprefer|choice|choose|select\b/.test(lower)) add("multiple_choice", "Which option do you prefer?", true, ["Option 1", "Option 2", "Option 3"]);
  if (/\bconsent|agree|permission\b/.test(lower)) add("consent", "Do you agree to participate?");
  if (/\bfeedback|comment|suggestion|thought|experience\b/.test(lower)) add("long_text", "What would you like us to know?", false);
  if (!fields.length) { add("short_text", "What would you like to share?"); add("long_text", "Tell us a little more.", false); }
  const title = prompt.replace(/^(please\s+)?(create|build|make)\s+(me\s+)?(a|an)\s+/i, "").split(/[.!?\n]/)[0].trim().slice(0, 80) || "New form";
  const preset = /\bfun|playful\b/.test(lower) ? "playful" : /\bbright|colorful|vibrant\b/.test(lower) ? "vibrant" : /\bwarm|cozy\b/.test(lower) ? "warm" : "minimal";
  return { title: title[0].toUpperCase() + title.slice(1), description: "", preset, thank_you: "Thanks for sharing your thoughts!", fields };
}
