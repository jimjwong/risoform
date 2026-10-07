import assert from "node:assert/strict";
import { summarizeResponses } from "../src/lib/response-stats.ts";

const fields = [
  { id: "rating", type: "rating", title: "How was it?", required: true },
  { id: "choice", type: "multiple_choice", title: "Favorite?", required: false, options: ["A", "B"] },
  { id: "note", type: "long_text", title: "Comment", required: false },
];
const snapshot = fields.map(({ id, title, type }) => ({ id, title, type }));
const responses = [
  { id: "one", form_id: "form", submitted_at: "2026-10-08T04:00:00.000Z", field_snapshot: snapshot, answers: { rating: 5, choice: "A", note: "Great" } },
  { id: "two", form_id: "form", submitted_at: "2026-10-07T04:00:00.000Z", field_snapshot: snapshot, answers: { rating: 3, choice: "B" } },
];
const stats = summarizeResponses(fields, responses, new Date("2026-10-08T12:00:00.000Z"));
assert.equal(stats.total, 2);
assert.equal(stats.pastWeek, 2);
assert.equal(stats.completion, 83);
assert.equal(stats.questions[0].average, 4);
assert.equal(stats.questions[0].choices.find((choice) => choice.label === "5")?.count, 1);
assert.equal(stats.questions[1].choices.find((choice) => choice.label === "A")?.percent, 50);
assert.equal(stats.questions[2].completion, 50);
assert.equal(stats.days.reduce((sum, day) => sum + day.count, 0), 2);
console.log("Response statistics checks passed.");
