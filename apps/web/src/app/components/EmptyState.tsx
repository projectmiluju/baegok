import type { ReactNode } from "react";

interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({ message, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <div
      className="rounded-xl border border-dashed p-12 flex flex-col items-center justify-center text-center"
      style={{
        backgroundColor: "var(--color-bg-alt)",
        borderColor: "rgba(0,0,0,0.15)",
      }}
    >
      {icon && (
        <div className="mb-4" style={{ color: "var(--color-text-muted)", fontSize: "48px" }}>
          {icon}
        </div>
      )}
      <p className="text-base mb-4" style={{ color: "var(--color-text-secondary)" }}>
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="rounded-lg px-5 py-2.5 text-base font-semibold text-white cursor-pointer transition-colors border-none"
          style={{ backgroundColor: "var(--color-cta)" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-cta-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-cta)")}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
