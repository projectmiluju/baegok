"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, BookOpen, GitCommitHorizontal } from "lucide-react";
import { useAuthStore } from "./lib/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const TEXT = {
  hero: "AI가 당신의 학습 성장을 기록합니다",
  subtitle: "push하면 자동 분석, 매일 학습 요약, 기간 리포트, 학습 로드맵",
  cta: "GitHub로 시작하기",
  features: [
    {
      title: "자동 커밋 분석",
      description: "GitHub에 push하면 AI가 자동으로 커밋을 분석하고 학습 내용을 요약합니다.",
      icon: GitCommitHorizontal,
    },
    {
      title: "일일 학습 요약",
      description: "매일의 학습 활동을 한눈에 파악할 수 있는 요약을 제공합니다.",
      icon: BookOpen,
    },
    {
      title: "성장 리포트",
      description: "기간별 학습 리포트로 강점과 약점을 파악하고, 맞춤 로드맵을 받습니다.",
      icon: BarChart3,
    },
  ],
} as const;

export default function LandingPage() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{
            borderColor: "var(--color-cta)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <h1
          className="text-4xl md:text-5xl font-bold mb-4 max-w-2xl"
          style={{ letterSpacing: "-1px", lineHeight: "1.2" }}
        >
          {TEXT.hero}
        </h1>
        <p className="text-lg mb-8 max-w-lg" style={{ color: "var(--color-text-secondary)" }}>
          {TEXT.subtitle}
        </p>
        <a
          href={`${API_URL}/api/auth/github`}
          className="inline-flex items-center gap-2 rounded-lg px-7 py-3.5 text-base font-semibold text-white no-underline transition-colors"
          style={{ backgroundColor: "var(--color-cta)" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-cta-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-cta)")}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          {TEXT.cta}
        </a>
      </section>

      {/* Features */}
      <section className="px-6 py-16" style={{ backgroundColor: "var(--color-bg-alt)" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {TEXT.features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-xl border p-6"
                style={{
                  backgroundColor: "var(--color-bg)",
                  borderColor: "var(--color-border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div className="mb-3" style={{ color: "var(--color-cta)" }}>
                  <Icon size={28} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center">
        <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          &copy; 2026 배곡
        </span>
      </footer>
    </div>
  );
}
