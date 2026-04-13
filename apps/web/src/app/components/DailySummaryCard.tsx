import { TagChip } from "./TagChip";

interface DailySummaryCardProps {
  date: string;
  summaryText: string;
  commitCount: number;
  tags: string[];
}

const TEXT = {
  commits: "커밋",
} as const;

export function DailySummaryCard({
  date,
  summaryText,
  commitCount,
  tags = [],
}: DailySummaryCardProps) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{
        backgroundColor: "var(--color-bg)",
        borderColor: "var(--color-border)",
        borderLeftWidth: "4px",
        borderLeftColor: "var(--color-cta)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="text-sm font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>
        {date}
      </div>
      <p className="text-base leading-relaxed mb-3">{summaryText}</p>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <TagChip key={tag} label={tag} />
          ))}
        </div>
        <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {commitCount} {TEXT.commits}
        </span>
      </div>
    </div>
  );
}

export function DailySummaryCardSkeleton() {
  return (
    <div
      className="rounded-xl border p-5 animate-pulse"
      style={{
        backgroundColor: "var(--color-bg)",
        borderColor: "var(--color-border)",
        borderLeftWidth: "4px",
        borderLeftColor: "var(--color-bg-alt)",
      }}
    >
      <div className="h-4 w-24 rounded mb-3" style={{ backgroundColor: "var(--color-bg-alt)" }} />
      <div className="h-4 w-full rounded mb-2" style={{ backgroundColor: "var(--color-bg-alt)" }} />
      <div className="h-4 w-3/4 rounded mb-2" style={{ backgroundColor: "var(--color-bg-alt)" }} />
      <div className="h-4 w-1/2 rounded mb-4" style={{ backgroundColor: "var(--color-bg-alt)" }} />
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-full" style={{ backgroundColor: "var(--color-bg-alt)" }} />
        <div className="h-6 w-16 rounded-full" style={{ backgroundColor: "var(--color-bg-alt)" }} />
      </div>
    </div>
  );
}
