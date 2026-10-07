"use client";

import { BarChart3, CalendarDays, CircleCheck, MessageSquareText } from "lucide-react";
import { summarizeResponses } from "@/lib/response-stats";
import type { FormField, ResponseRecord } from "@/lib/types";

export default function ResponseAnalytics({ fields, responses }: { fields: FormField[]; responses: ResponseRecord[] }) {
  const stats = summarizeResponses(fields, responses);
  const maxDay = Math.max(1, ...stats.days.map((day) => day.count));
  const charts = stats.questions.filter((question) => question.choices.length);
  return <div className="analytics">
    <div className="analytics-summary">
      <div className="analytics-metric"><MessageSquareText size={19} /><span>Total responses</span><strong>{stats.total}</strong></div>
      <div className="analytics-metric"><CalendarDays size={19} /><span>Last 7 days</span><strong>{stats.pastWeek}</strong></div>
      <div className="analytics-metric"><CircleCheck size={19} /><span>Questions answered</span><strong>{stats.completion}%</strong></div>
      <div className="analytics-metric"><BarChart3 size={19} /><span>Latest response</span><strong className="analytics-date">{stats.latestAt ? new Date(stats.latestAt).toLocaleDateString() : "—"}</strong></div>
    </div>
    <div className="analytics-panel"><div className="analytics-heading"><h2>Responses over time</h2><p>Daily submissions in the last 14 days</p></div><div className="daily-chart" role="img" aria-label={stats.days.map((day) => `${day.label}: ${day.count} responses`).join(", ")}>{stats.days.map((day) => <div className="daily-column" key={day.key}><span>{day.count || ""}</span><div className="daily-track"><div style={{ height: `${Math.max(day.count ? 6 : 0, day.count / maxDay * 100)}%` }} /></div><small>{day.label}</small></div>)}</div></div>
    {charts.length > 0 && <div className="question-charts">{charts.map((question) => <section className="analytics-panel question-chart" key={question.id}><div className="analytics-heading"><h2>{question.title}</h2><p>{question.answered} answered · {question.completion}% of responses{question.average !== undefined ? ` · average ${question.average}` : ""}</p></div><div className="choice-bars">{question.choices.map((choice) => <div className="choice-stat" key={choice.label}><div className="choice-stat-label"><span>{choice.label}</span><strong>{choice.count} <small>({choice.percent}%)</small></strong></div><div className="choice-stat-track"><div style={{ width: `${choice.percent}%` }} /></div></div>)}</div></section>)}</div>}
  </div>;
}
