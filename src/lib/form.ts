import type { FieldType, FormField, FormRecord, Theme } from "./types";

export const fieldCatalog: { type: FieldType; label: string; hint: string }[] = [
  { type: "short_text", label: "Short text", hint: "A quick answer" },
  { type: "long_text", label: "Long text", hint: "A longer response" },
  { type: "name", label: "Name", hint: "First and last name" },
  { type: "email", label: "Email", hint: "Email address" },
  { type: "phone", label: "Phone", hint: "Phone number" },
  { type: "website", label: "Website", hint: "URL" },
  { type: "number", label: "Number", hint: "Numeric answer" },
  { type: "date", label: "Date", hint: "Calendar date" },
  { type: "time", label: "Time", hint: "Time of day" },
  { type: "dropdown", label: "Dropdown", hint: "Choose one" },
  { type: "multiple_choice", label: "Multiple choice", hint: "Choose one" },
  { type: "checkboxes", label: "Checkboxes", hint: "Choose several" },
  { type: "yes_no", label: "Yes or no", hint: "Two clear choices" },
  { type: "rating", label: "Rating", hint: "One to five stars" },
  { type: "opinion_scale", label: "Opinion scale", hint: "One to ten" },
  { type: "file", label: "File upload", hint: "Up to 10 MB each" },
  { type: "address", label: "Address", hint: "Street, city and country" },
  { type: "consent", label: "Consent", hint: "Required acknowledgement" },
];

export const presets: Record<Theme["preset"], Theme> = {
  minimal: { preset: "minimal", background: "#f7f8f6", foreground: "#192820", accent: "#36684f", card: "#ffffff", radius: 18 },
  warm: { preset: "warm", background: "#faf2e7", foreground: "#472c25", accent: "#bf6745", card: "#fffaf4", radius: 22 },
  vibrant: { preset: "vibrant", background: "#e9e8ff", foreground: "#241e52", accent: "#6547dc", card: "#ffffff", radius: 24 },
  playful: { preset: "playful", background: "#fff4be", foreground: "#29230c", accent: "#ed5d72", card: "#ffffff", radius: 30 },
  dark: { preset: "dark", background: "#171c23", foreground: "#f8fafc", accent: "#9bdcc0", card: "#242c35", radius: 18 },
};

export function newField(type: FieldType): FormField {
  const label = fieldCatalog.find((item) => item.type === type)?.label ?? "Question";
  return {
    id: crypto.randomUUID(), type, title: `Your ${label.toLowerCase()} question`, required: true,
    ...(type === "dropdown" || type === "multiple_choice" || type === "checkboxes" ? { options: ["Option 1", "Option 2"] } : {}),
    ...(type === "file" ? { maxFiles: 1 } : {}),
  };
}

export function newForm(workspaceId: string): FormRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), workspace_id: workspaceId, title: "Untitled form", description: "",
    status: "draft", fields: [newField("short_text")], theme: presets.minimal,
    thank_you: "Thanks for sharing your thoughts!", created_at: now, updated_at: now,
  };
}

export function isOptionType(type: FieldType) {
  return type === "dropdown" || type === "multiple_choice" || type === "checkboxes";
}

export function answerToText(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(answerToText).join(", ");
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (typeof object.name === "string") return object.name;
    return Object.values(object).map(answerToText).filter(Boolean).join(", ");
  }
  return String(value);
}
