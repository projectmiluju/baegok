"use client";

import { useEffect, useState, useCallback } from "react";
import { GitCommitHorizontal, CalendarDays, Tag } from "lucide-react";
import { apiFetch } from "../lib/api";
import { StatCard } from "../components/StatCard";
import { DailySummaryCard, DailySummaryCardSkeleton } from "../components/DailySummaryCard";
import { EmptyState } from "../components/EmptyState";
import type { DailySummary, WeeklyStats } from "../lib/types";

const TEXT = {
  title: "대시보드",
  weeklyCommits: "이번 주 커밋",
  activeDays: "활동일 수",
  topTag: "가장 많이 쓴 태그",
  todaySummary: "오늘의 학습 요약",
  recentSummaries: "최근 7일 요약",
  emptyToday: "오늘은 커밋 기록이 없습니다",
  emptyRecent: "최근 학습 기록이 없습니다",
  error: "오류가 발생했습니다",
  noTag: "-",
} as const;

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getRecentDates(days: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(formatDate(d));
  }
  return dates;
}

export default function DashboardPage() {
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    commitCount: 0,
    activeDays: 0,
    topTag: TEXT.noTag,
  });
  const [todaySummary, setTodaySummary] = useState<DailySummary | null>(null);
  const [recentSummaries, setRecentSummaries] = useState<DailySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const today = formatDate(new Date());
      const dates = getRecentDates(7);

      const summaryPromises = dates.map((date) =>
        apiFetch<{ summary: DailySummary }>(`/api/summaries/daily?date=${date}`)
          .then((data) => data.summary)
          .catch(() => null),
      );

      const results = await Promise.all(summaryPromises);
      const validSummaries = results.filter((s): s is DailySummary => s !== null);

      // Today's summary
      const todayResult = validSummaries.find((s) => s.date === today);
      setTodaySummary(todayResult ?? null);

      // Recent (excluding today)
      const recent = validSummaries.filter((s) => s.date !== today);
      setRecentSummaries(recent);

      // Calculate weekly stats
      const totalCommits = validSummaries.reduce((sum, s) => sum + s.commitCount, 0);
      const activeDays = validSummaries.length;

      // Count tags
      const tagCounts: Record<string, number> = {};
      for (const s of validSummaries) {
        for (const tag of s.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
      const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? TEXT.noTag;

      setWeeklyStats({ commitCount: totalCommits, activeDays, topTag });
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold mb-8" style={{ letterSpacing: "-1px" }}>
        {TEXT.title}
      </h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label={TEXT.weeklyCommits}
          value={weeklyStats.commitCount}
          icon={<GitCommitHorizontal size={24} />}
          isLoading={isLoading}
          isError={isError}
        />
        <StatCard
          label={TEXT.activeDays}
          value={weeklyStats.activeDays}
          icon={<CalendarDays size={24} />}
          isLoading={isLoading}
          isError={isError}
        />
        <StatCard
          label={TEXT.topTag}
          value={weeklyStats.topTag}
          icon={<Tag size={24} />}
          isLoading={isLoading}
          isError={isError}
        />
      </div>

      {/* Today's Summary */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4" style={{ letterSpacing: "-0.5px" }}>
          {TEXT.todaySummary}
        </h2>
        {isLoading ? (
          <DailySummaryCardSkeleton />
        ) : todaySummary ? (
          <DailySummaryCard
            date={todaySummary.date}
            summaryText={todaySummary.summaryText}
            commitCount={todaySummary.commitCount}
            tags={todaySummary.tags}
          />
        ) : (
          <EmptyState message={TEXT.emptyToday} />
        )}
      </section>

      {/* Recent 7 Days */}
      <section>
        <h2 className="text-2xl font-bold mb-4" style={{ letterSpacing: "-0.5px" }}>
          {TEXT.recentSummaries}
        </h2>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <DailySummaryCardSkeleton key={i} />
            ))}
          </div>
        ) : recentSummaries.length > 0 ? (
          <div className="space-y-4">
            {recentSummaries.map((summary, index) => (
              <DailySummaryCard
                key={summary.id ?? `summary-${index}`}
                date={summary.date}
                summaryText={summary.summaryText}
                commitCount={summary.commitCount}
                tags={summary.tags}
              />
            ))}
          </div>
        ) : (
          <EmptyState message={TEXT.emptyRecent} />
        )}
      </section>
    </div>
  );
}
