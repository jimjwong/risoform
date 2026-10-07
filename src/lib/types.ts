export type FieldType =
  | "short_text" | "long_text" | "email" | "phone" | "website" | "number"
  | "date" | "time" | "dropdown" | "multiple_choice" | "checkboxes"
  | "yes_no" | "rating" | "opinion_scale" | "file" | "name"
  | "address" | "consent";

export type FormField = {
  id: string;
  type: FieldType;
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  maxFiles?: number;
};

export type Theme = {
  preset: "minimal" | "warm" | "vibrant" | "playful" | "dark";
  background: string;
  foreground: string;
  accent: string;
  card: string;
  radius: number;
};

export type FormRecord = {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  status: "draft" | "published";
  fields: FormField[];
  theme: Theme;
  thank_you: string;
  created_at: string;
  updated_at: string;
};

export type Workspace = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type ResponseRecord = {
  id: string;
  form_id: string;
  answers: Record<string, unknown>;
  field_snapshot: Pick<FormField, "id" | "title" | "type">[];
  submitted_at: string;
};
