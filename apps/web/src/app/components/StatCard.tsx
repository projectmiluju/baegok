import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
}

export function StatCard({ label, value, icon, isLoading, isError }: StatCardProps) {
  return (
    <div
      className="rounded-xl border p-6 min-w-[160px]"
      style={{
        backgroundColor: "var(--color-bg)",
        borderColor: "var(--color-border)",
        borderTopWidth: "3px",
        borderTopColor: "var(--color-cta)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {icon && (
        <div className="mb-3" style={{ color: "var(--color-text-muted)" }}>
          {icon}
        </div>
      )}
      <div className="text-4xl font-bold" style={{ color: "var(--color-cta)" }}>
        {isLoading ? (
          <div
            className="h-9 w-20 rounded animate-pulse"
            style={{ backgroundColor: "var(--color-bg-alt)" }}
          />
        ) : isError ? (
          "-"
        ) : (
          value
        )}
      </div>
      <div className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </div>
    </div>
  );
}
