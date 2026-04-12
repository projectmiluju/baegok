"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { ReportCard } from "../../components/ReportCard";
import { EmptyState } from "../../components/EmptyState";
import type { Report } from "../../lib/types";

const TEXT = {
  title: "리포트",
  createReport: "새 리포트 생성",
  emptyReports: "생성된 리포트가 없습니다",
  startDate: "시작일",
  endDate: "종료일",
  generate: "생성",
  generating: "생성 중...",
  error: "오류가 발생했습니다",
  retry: "다시 시도",
  loading: "불러오는 중...",
} as const;

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Report[]>("/api/reports");
      setReports(data);
    } catch {
      setError(TEXT.error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;

    setIsCreating(true);
    setError(null);
    try {
      await apiFetch<Report>("/api/reports", {
        method: "POST",
        body: JSON.stringify({ startDate, endDate }),
      });
      setShowForm(false);
      setStartDate("");
      setEndDate("");
      await fetchReports();
    } catch {
      setError(TEXT.error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl md:text-4xl font-bold" style={{ letterSpacing: "-1px" }}>
          {TEXT.title}
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white cursor-pointer transition-colors border-none"
          style={{ backgroundColor: "var(--color-cta)" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-cta-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-cta)")}
        >
          {TEXT.createReport}
        </button>
      </div>

      {/* Create Report Form */}
      {showForm && (
        <form
          onSubmit={handleCreateReport}
          className="rounded-xl border p-6 mb-6"
          style={{
            backgroundColor: "var(--color-bg)",
            borderColor: "var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {TEXT.startDate}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border px-3.5 py-2.5 text-sm"
                style={{ borderColor: "#dddddd" }}
                required
              />
            </div>
            <div className="flex-1">
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {TEXT.endDate}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border px-3.5 py-2.5 text-sm"
                style={{ borderColor: "#dddddd" }}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white cursor-pointer border-none transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--color-cta)" }}
            >
              {isCreating ? TEXT.generating : TEXT.generate}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div
          className="rounded-lg p-4 mb-4 text-sm"
          style={{
            backgroundColor: "#fef2f2",
            color: "var(--color-error)",
          }}
        >
          {error}
          <button
            onClick={fetchReports}
            className="ml-2 underline bg-transparent border-none cursor-pointer"
            style={{ color: "var(--color-error)" }}
          >
            {TEXT.retry}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border p-6 animate-pulse"
              style={{
                backgroundColor: "var(--color-bg)",
                borderColor: "var(--color-border)",
              }}
            >
              <div
                className="h-4 w-40 rounded mb-3"
                style={{ backgroundColor: "var(--color-bg-alt)" }}
              />
              <div
                className="h-4 w-24 rounded"
                style={{ backgroundColor: "var(--color-bg-alt)" }}
              />
            </div>
          ))}
        </div>
      ) : reports.length > 0 ? (
        <div className="space-y-4">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              id={report.id}
              startDate={report.startDate}
              endDate={report.endDate}
              reportType={report.reportType}
              summary={report.summary}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          message={TEXT.emptyReports}
          actionLabel={TEXT.createReport}
          onAction={() => setShowForm(true)}
          icon={<FileText size={48} />}
        />
      )}
    </div>
  );
}
