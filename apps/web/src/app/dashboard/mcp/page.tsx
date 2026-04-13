"use client";

import { useState } from "react";
import { Copy, Check, Terminal, MonitorSmartphone } from "lucide-react";

const TEXT = {
  title: "MCP 연결 가이드",
  subtitle: "IDE에서 배곡 학습 데이터를 직접 조회할 수 있습니다",
  step1Title: "1. JWT 토큰 복사",
  step1Desc: "브라우저 DevTools에서 JWT 토큰을 복사합니다.",
  step2Title: "2. MCP 설정 파일 생성",
  step2Desc: "프로젝트 루트에 .mcp.json 파일을 만드세요.",
  step3Title: "3. IDE에서 확인",
  step3Desc: "IDE를 재시작하면 배곡 MCP 도구를 사용할 수 있습니다.",
  copied: "복사됨",
  tools: "사용 가능한 도구",
  toolDaily: "get_daily_summary",
  toolDailyDesc: "특정 날짜의 학습 요약 조회",
  toolRecent: "list_recent_summaries",
  toolRecentDesc: "최근 N일간 학습 요약 목록",
  toolReport: "get_period_report",
  toolReportDesc: "기간별 학습 리포트 생성",
  toolRoadmap: "get_roadmap",
  toolRoadmapDesc: "학습 로드맵 조회",
  claudeCode: "Claude Code",
  cursor: "Cursor",
} as const;

const TOOLS = [
  { name: TEXT.toolDaily, desc: TEXT.toolDailyDesc },
  { name: TEXT.toolRecent, desc: TEXT.toolRecentDesc },
  { name: TEXT.toolReport, desc: TEXT.toolReportDesc },
  { name: TEXT.toolRoadmap, desc: TEXT.toolRoadmapDesc },
];

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg overflow-hidden" style={{ backgroundColor: "#1e1e2e" }}>
      <div
        className="flex items-center justify-between px-4 py-2 text-xs"
        style={{ backgroundColor: "#313244", color: "#cdd6f4" }}
      >
        <span>{label}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 bg-transparent border-none cursor-pointer text-xs"
          style={{ color: "#cdd6f4" }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? TEXT.copied : "복사"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed m-0" style={{ color: "#cdd6f4" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function McpGuidePage() {
  // JWT는 httpOnly 쿠키라 JS 접근 불가 — DevTools에서 복사 안내
  const mcpConfig = `{
  "mcpServers": {
    "baegok": {
      "command": "bun",
      "args": ["run", "dev"],
      "cwd": "./apps/mcp",
      "env": {
        "BAEGOK_API_TOKEN": "여기에_JWT_토큰_붙여넣기",
        "BAEGOK_API_BASE_URL": "https://baegok.site"
      }
    }
  }
}`;

  const cursorConfig = `{
  "mcpServers": {
    "baegok": {
      "command": "bun",
      "args": ["run", "dev"],
      "cwd": "./apps/mcp",
      "env": {
        "BAEGOK_API_TOKEN": "여기에_JWT_토큰_붙여넣기",
        "BAEGOK_API_BASE_URL": "https://baegok.site"
      }
    }
  }
}`;

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ letterSpacing: "-1px" }}>
        {TEXT.title}
      </h1>
      <p className="text-base mb-8" style={{ color: "var(--color-text-secondary)" }}>
        {TEXT.subtitle}
      </p>

      {/* Step 1: JWT 토큰 */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: "var(--color-cta)" }}
          >
            1
          </div>
          <h2 className="text-xl font-semibold">{TEXT.step1Title}</h2>
        </div>
        <p className="text-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>
          브라우저 DevTools에서 JWT 토큰을 복사하세요.
        </p>
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: "var(--color-bg-alt)",
            borderColor: "var(--color-border)",
          }}
        >
          <ol
            className="list-decimal list-inside space-y-2 text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <li>
              <strong>F12</strong> (또는 Cmd+Option+I)로 DevTools 열기
            </li>
            <li>
              <strong>Application</strong> 탭 → <strong>Cookies</strong> →{" "}
              <strong>baegok.site</strong>
            </li>
            <li>
              <code
                className="px-1.5 py-0.5 rounded text-xs"
                style={{ backgroundColor: "var(--color-tag-bg)", color: "var(--color-tag-text)" }}
              >
                baegok_session
              </code>{" "}
              값을 복사
            </li>
          </ol>
        </div>
      </section>

      {/* Step 2: MCP 설정 */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: "var(--color-cta)" }}
          >
            2
          </div>
          <h2 className="text-xl font-semibold">{TEXT.step2Title}</h2>
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
          {TEXT.step2Desc}
        </p>

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal size={16} style={{ color: "var(--color-cta)" }} />
              <span className="text-sm font-semibold">{TEXT.claudeCode}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "var(--color-tag-bg)",
                  color: "var(--color-tag-text)",
                }}
              >
                .mcp.json
              </span>
            </div>
            <CodeBlock code={mcpConfig} label=".mcp.json (프로젝트 루트)" />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <MonitorSmartphone size={16} style={{ color: "var(--color-cta)" }} />
              <span className="text-sm font-semibold">{TEXT.cursor}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "var(--color-tag-bg)",
                  color: "var(--color-tag-text)",
                }}
              >
                .cursor/mcp.json
              </span>
            </div>
            <CodeBlock code={cursorConfig} label=".cursor/mcp.json" />
          </div>
        </div>
      </section>

      {/* Step 3: IDE 확인 */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: "var(--color-cta)" }}
          >
            3
          </div>
          <h2 className="text-xl font-semibold">{TEXT.step3Title}</h2>
        </div>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {TEXT.step3Desc}
        </p>
      </section>

      {/* 도구 목록 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">{TEXT.tools}</h2>
        <div className="grid gap-3">
          {TOOLS.map((tool) => (
            <div
              key={tool.name}
              className="flex items-center gap-4 p-4 rounded-xl border"
              style={{
                backgroundColor: "var(--color-bg)",
                borderColor: "var(--color-border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <code
                className="text-sm font-semibold px-2 py-1 rounded"
                style={{
                  backgroundColor: "var(--color-tag-bg)",
                  color: "var(--color-tag-text)",
                }}
              >
                {tool.name}
              </code>
              <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {tool.desc}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
