export interface User {
  id: string;
  githubId: number;
  githubUsername: string;
  avatarUrl: string;
}

export interface DailySummary {
  id: string;
  date: string;
  summaryText: string;
  commitCount: number;
  tags: string[];
}

export interface Repository {
  id: string;
  fullName: string;
  isActive: boolean;
  webhookId: number | null;
}

export interface GithubRepository {
  id: number;
  fullName: string;
  description: string | null;
  isPrivate: boolean;
}

export interface ReportSummary {
  strengths: string[];
  weaknesses: string[];
  stats: {
    totalCommits: number;
    activeDays: number;
    topTags: string[];
  };
}

export interface ReportRoadmap {
  recommendedTopics: string[];
  reasoning: string;
  nextSteps: string[];
}

export interface Report {
  id: string;
  startDate: string;
  endDate: string;
  reportType: "CUSTOM" | "WEEKLY_AUTO";
  summary: ReportSummary;
  roadmap?: ReportRoadmap;
  createdAt: string;
}

export interface WeeklyStats {
  commitCount: number;
  activeDays: number;
  topTag: string;
}

export interface GithubRepoRaw {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  private: boolean;
}

export interface ApiError {
  error?: string;
  message?: string;
  statusCode: number;
}
