const TEXT = {
  connected: "연결됨",
  inactive: "비활성",
  disconnect: "연결 해제",
} as const;

interface RepoCardProps {
  fullName: string;
  isActive: boolean;
  onDisconnect: () => void;
}

export function RepoCard({ fullName, isActive, onDisconnect }: RepoCardProps) {
  return (
    <div
      className="rounded-xl border p-5 flex items-center justify-between"
      style={{
        backgroundColor: "var(--color-bg)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold">{fullName}</span>
        {isActive ? (
          <span
            className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{
              backgroundColor: "var(--color-tag-bg)",
              color: "var(--color-tag-text)",
            }}
          >
            {TEXT.connected}
          </span>
        ) : (
          <span
            className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{
              backgroundColor: "#fff3e6",
              color: "var(--color-warning)",
            }}
          >
            {TEXT.inactive}
          </span>
        )}
      </div>
      <button
        onClick={onDisconnect}
        className="text-sm bg-transparent border-none cursor-pointer transition-colors"
        style={{ color: "var(--color-text-secondary)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-error)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
      >
        {TEXT.disconnect}
      </button>
    </div>
  );
}
