import Link from "next/link";

interface ReportSummaryBrief {
  strengths: string[];
  weaknesses: string[];
  stats: {
    totalCommits: number;
    activeDays: number;
    topTags: string[];
  };
}

interface ReportCardProps {
  id: string;
  startDate: string;
  endDate: string;
  reportType: string;
  summary: ReportSummaryBrief;
}

const TEXT = {
  custom: "커스텀",
  weeklyAuto: "주간 자동",
  commits: "커밋",
  activeDays: "활동일",
} as const;

export function ReportCard({ id, startDate, endDate, reportType, summary }: ReportCardProps) {
  const typeLabel = reportType === "weekly_auto" ? TEXT.weeklyAuto : TEXT.custom;

  return (
    <Link
      href={`/dashboard/reports/${id}`}
      className="block rounded-xl border p-6 transition-shadow hover:shadow-md no-underline"
      style={{
        backgroundColor: "var(--color-bg)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-card)",
        color: "inherit",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
          {startDate} ~ {endDate}
        </span>
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
      <div className="flex gap-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
        <span>
          {summary.stats.totalCommits} {TEXT.commits}
        </span>
        <span>
          {summary.stats.activeDays} {TEXT.activeDays}
        </span>
      </div>
    </Link>
  );
}
