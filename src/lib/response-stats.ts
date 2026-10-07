import type { FormField, ResponseRecord } from "./types";

export type ChoiceStat = { label: string; count: number; percent: number };
export type QuestionStat = {
  id: string;
  title: string;
  type: FormField["type"];
  answered: number;
  completion: number;
  average?: number;
  choices: ChoiceStat[];
};

const chartTypes = new Set<FormField["type"]>(["dropdown", "multiple_choice", "checkboxes", "yes_no", "rating", "opinion_scale"]);
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const hasAnswer = (value: unknown) => value !== undefined && value !== null && value !== "" && (!Array.isArray(value) || value.length > 0);

export function summarizeResponses(fields: FormField[], responses: ResponseRecord[], now = new Date()) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(startOfToday);
    date.setDate(date.getDate() - 13 + index);
    return { key: dateKey(date), label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }), count: 0 };
  });
  const byDay = new Map(days.map((day) => [day.key, day]));
  let pastWeek = 0;
  let latest: Date | null = null;
  for (const response of responses) {
    const date = new Date(response.submitted_at);
    if (Number.isNaN(date.getTime())) continue;
    const day = byDay.get(dateKey(date));
    if (day) day.count += 1;
    if (date >= new Date(startOfToday.getTime() - 6 * 86400000) && date <= now) pastWeek += 1;
    if (!latest || date > latest) latest = date;
  }
  const questions: QuestionStat[] = fields.map((field) => {
    const values = responses.filter((response) => response.field_snapshot?.some((snapshot) => snapshot.id === field.id && snapshot.type === field.type)).map((response) => response.answers?.[field.id]).filter(hasAnswer);
    const answered = values.length;
    const counts = new Map<string, number>();
    const seed = field.type === "yes_no" ? ["Yes", "No"] : field.type === "rating" ? ["1", "2", "3", "4", "5"] : field.type === "opinion_scale" ? Array.from({ length: 10 }, (_, index) => String(index + 1)) : field.options ?? [];
    for (const label of seed) counts.set(label, 0);
    if (chartTypes.has(field.type)) {
      for (const value of values) for (const answer of field.type === "checkboxes" && Array.isArray(value) ? value : [value]) {
        if (typeof answer !== "string" && typeof answer !== "number") continue;
        const label = String(answer);
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
    }
    const numeric = (field.type === "rating" || field.type === "opinion_scale") ? values.filter((value): value is number => typeof value === "number" && Number.isFinite(value)) : [];
    return {
      id: field.id,
      title: field.title,
      type: field.type,
      answered,
      completion: responses.length ? Math.round(answered / responses.length * 100) : 0,
      ...(numeric.length ? { average: Number((numeric.reduce((sum, value) => sum + value, 0) / numeric.length).toFixed(1)) } : {}),
      choices: [...counts.entries()].map(([label, count]) => ({ label, count, percent: answered ? Math.round(count / answered * 100) : 0 })),
    };
  });
  const answeredQuestions = questions.reduce((sum, question) => sum + question.answered, 0);
  return {
    total: responses.length,
    pastWeek,
    latestAt: latest?.toISOString() ?? null,
    completion: responses.length && fields.length ? Math.round(answeredQuestions / (responses.length * fields.length) * 100) : 0,
    days,
    questions,
  };
}
