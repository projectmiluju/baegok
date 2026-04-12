"use client";

import { useEffect, useState, useCallback } from "react";
import { GitFork, Plus, X } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { RepoCard } from "../../components/RepoCard";
import { EmptyState } from "../../components/EmptyState";
import type { Repository, GithubRepository } from "../../lib/types";

const TEXT = {
  title: "레포 관리",
  connect: "레포 연결하기",
  emptyRepos: "아직 연결된 레포가 없습니다",
  modalTitle: "GitHub 레포 선택",
  connecting: "연결 중...",
  error: "오류가 발생했습니다",
  retry: "다시 시도",
  loading: "불러오는 중...",
  connectBtn: "연결",
  noGithubRepos: "연결 가능한 레포가 없습니다",
} as const;

export default function ReposPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [githubRepos, setGithubRepos] = useState<GithubRepository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRepos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Repository[]>("/api/repositories");
      setRepos(data);
    } catch {
      setError(TEXT.error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  const openModal = async () => {
    setIsModalOpen(true);
    setIsModalLoading(true);
    try {
      const data = await apiFetch<GithubRepository[]>("/api/repositories/github");
      setGithubRepos(data);
    } catch {
      setGithubRepos([]);
    } finally {
      setIsModalLoading(false);
    }
  };

  const connectRepo = async (fullName: string, githubRepoId: number) => {
    setConnectingId(githubRepoId);
    try {
      await apiFetch<Repository>("/api/repositories", {
        method: "POST",
        body: JSON.stringify({ fullName }),
      });
      setIsModalOpen(false);
      await fetchRepos();
    } catch {
      setError(TEXT.error);
    } finally {
      setConnectingId(null);
    }
  };

  const disconnectRepo = async (repoId: string) => {
    try {
      await apiFetch(`/api/repositories/${repoId}`, { method: "DELETE" });
      setRepos((prev) => prev.filter((r) => r.id !== repoId));
    } catch {
      setError(TEXT.error);
    }
  };

  // Filter out already connected repos from GitHub list
  const connectedFullNames = new Set(repos.map((r) => r.fullName));
  const availableGithubRepos = githubRepos.filter((r) => !connectedFullNames.has(r.fullName));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl md:text-4xl font-bold" style={{ letterSpacing: "-1px" }}>
          {TEXT.title}
        </h1>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white cursor-pointer transition-colors border-none"
          style={{ backgroundColor: "var(--color-cta)" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-cta-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-cta)")}
        >
          <Plus size={18} />
          {TEXT.connect}
        </button>
      </div>

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
            onClick={fetchRepos}
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
              className="rounded-xl border p-5 animate-pulse"
              style={{
                backgroundColor: "var(--color-bg)",
                borderColor: "var(--color-border)",
              }}
            >
              <div
                className="h-5 w-48 rounded"
                style={{ backgroundColor: "var(--color-bg-alt)" }}
              />
            </div>
          ))}
        </div>
      ) : repos.length > 0 ? (
        <div className="space-y-4">
          {repos.map((repo) => (
            <RepoCard
              key={repo.id}
              fullName={repo.fullName}
              isActive={repo.isActive}
              onDisconnect={() => disconnectRepo(repo.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          message={TEXT.emptyRepos}
          actionLabel={TEXT.connect}
          onAction={openModal}
          icon={<GitFork size={48} />}
        />
      )}

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="rounded-xl border p-6 w-full max-w-lg max-h-[70vh] overflow-auto"
            style={{
              backgroundColor: "var(--color-bg)",
              borderColor: "var(--color-border)",
              boxShadow: "var(--shadow-card)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{TEXT.modalTitle}</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-transparent border-none cursor-pointer p-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            {isModalLoading ? (
              <div className="flex justify-center py-8">
                <div
                  className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                  style={{
                    borderColor: "var(--color-cta)",
                    borderTopColor: "transparent",
                  }}
                />
              </div>
            ) : availableGithubRepos.length > 0 ? (
              <div className="space-y-2">
                {availableGithubRepos.map((repo) => (
                  <div
                    key={repo.id}
                    className="flex items-center justify-between rounded-lg p-3"
                    style={{
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    <div>
                      <div className="text-sm font-medium">{repo.fullName}</div>
                      {repo.description && (
                        <div
                          className="text-xs mt-0.5"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {repo.description}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => connectRepo(repo.fullName, repo.id)}
                      disabled={connectingId === repo.id}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white cursor-pointer border-none transition-colors disabled:opacity-50"
                      style={{ backgroundColor: "var(--color-cta)" }}
                    >
                      {connectingId === repo.id ? TEXT.connecting : TEXT.connectBtn}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-8" style={{ color: "var(--color-text-muted)" }}>
                {TEXT.noGithubRepos}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
