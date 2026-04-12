"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { apiFetch } from "../../../lib/api";
import { TagChip } from "../../../components/TagChip";
import type { Report } from "../../../lib/types";

const TEXT = {
  back: "리포트 목록",
  strengths: "잘한 것",
  weaknesses: "부족한 것",
  roadmap: "다음에 할 것",
  reasoning: "분석 근거",
  nextSteps: "다음 단계",
  recommendedTopics: "추천 학습 주제",
  stats: "기간 통계",
  commits: "커밋",
  activeDays: "활동일",
  topTags: "주요 태그",
  loading: "불러오는 중...",
  error: "오류가 발생했습니다",
  retry: "다시 시도",
  custom: "커스텀",
  weeklyAuto: "주간 자동",
} as const;

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Report>(`/api/reports/${reportId}`);
      setReport(data);
    } catch {
      setError(TEXT.error);
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: "var(--color-cta)",
              borderTopColor: "transparent",
            }}
          />
          <span style={{ color: "var(--color-text-secondary)" }}>{TEXT.loading}</span>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="text-center py-24">
        <p className="text-base mb-4" style={{ color: "var(--color-error)" }}>
          {error || TEXT.error}
        </p>
        <button
          onClick={fetchReport}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white cursor-pointer border-none"
          style={{ backgroundColor: "var(--color-cta)" }}
        >
          {TEXT.retry}
        </button>
      </div>
    );
  }

  const typeLabel = report.reportType === "weekly_auto" ? TEXT.weeklyAuto : TEXT.custom;

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => router.push("/dashboard/reports")}
        className="flex items-center gap-1 mb-6 text-sm bg-transparent border-none cursor-pointer"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <ArrowLeft size={16} />
        {TEXT.back}
      </button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl md:text-4xl font-bold" style={{ letterSpacing: "-1px" }}>
            {report.startDate} ~ {report.endDate}
          </h1>
          <span
            className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{
              backgroundColor: "var(--color-tag-bg)",
              color: "var(--color-tag-text)",
            }}
          >
            {typeLabel}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div
        className="rounded-xl border p-6 mb-6"
        style={{
          backgroundColor: "var(--color-bg)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <h2 className="text-lg font-semibold mb-4">{TEXT.stats}</h2>
        <div className="flex flex-wrap gap-6">
          <div>
            <span className="text-2xl font-bold" style={{ color: "var(--color-cta)" }}>
              {report.summary.stats.totalCommits}
            </span>
            <span className="ml-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {TEXT.commits}
            </span>
          </div>
          <div>
            <span className="text-2xl font-bold" style={{ color: "var(--color-cta)" }}>
              {report.summary.stats.activeDays}
            </span>
            <span className="ml-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {TEXT.activeDays}
            </span>
          </div>
        </div>
        {report.summary.stats.topTags.length > 0 && (
          <div className="mt-4">
            <span
              className="text-sm font-medium mr-2"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {TEXT.topTags}
            </span>
            <div className="inline-flex flex-wrap gap-1.5 mt-1">
              {report.summary.stats.topTags.map((tag) => (
                <TagChip key={tag} label={tag} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Strengths */}
      <div
        className="rounded-xl border p-6 mb-6"
        style={{
          backgroundColor: "var(--color-bg)",
          borderColor: "var(--color-border)",
          borderLeftWidth: "4px",
          borderLeftColor: "var(--color-cta)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <h2 className="text-lg font-semibold mb-3">{TEXT.strengths}</h2>
        <ul className="space-y-2 list-none pl-0">
          {report.summary.strengths.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-base leading-relaxed">
              <CheckCircle2
                size={18}
                className="mt-0.5 flex-shrink-0"
                style={{ color: "var(--color-cta)" }}
              />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Weaknesses */}
      <div
        className="rounded-xl border p-6 mb-6"
        style={{
          backgroundColor: "var(--color-bg)",
          borderColor: "var(--color-border)",
          borderLeftWidth: "4px",
          borderLeftColor: "var(--color-warning)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <h2 className="text-lg font-semibold mb-3">{TEXT.weaknesses}</h2>
        <ul className="space-y-2 list-none pl-0">
          {report.summary.weaknesses.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-base leading-relaxed">
              <span
                className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: "var(--color-warning)" }}
              />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Roadmap */}
      {report.roadmap && (
        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: "var(--color-bg)",
            borderColor: "var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <h2 className="text-lg font-semibold mb-4">{TEXT.roadmap}</h2>

          {/* Recommended Topics */}
          {report.roadmap.recommendedTopics.length > 0 && (
            <div className="mb-4">
              <h3
                className="text-sm font-medium mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {TEXT.recommendedTopics}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {report.roadmap.recommendedTopics.map((topic) => (
                  <TagChip key={topic} label={topic} />
                ))}
              </div>
            </div>
          )}

          {/* Reasoning */}
          {report.roadmap.reasoning && (
            <div className="mb-4">
              <h3
                className="text-sm font-medium mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {TEXT.reasoning}
              </h3>
              <p className="text-base leading-relaxed">{report.roadmap.reasoning}</p>
            </div>
          )}

          {/* Next Steps */}
          {report.roadmap.nextSteps.length > 0 && (
            <div>
              <h3
                className="text-sm font-medium mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {TEXT.nextSteps}
              </h3>
              <ol className="space-y-2 list-none pl-0">
                {report.roadmap.nextSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-base leading-relaxed">
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                      style={{ backgroundColor: "var(--color-cta)" }}
                    >
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
