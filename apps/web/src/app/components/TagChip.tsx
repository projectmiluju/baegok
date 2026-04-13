interface TagChipProps {
  label: string;
}

export function TagChip({ label }: TagChipProps) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide"
      style={{
        backgroundColor: "var(--color-tag-bg)",
        color: "var(--color-tag-text)",
        letterSpacing: "0.5px",
      }}
    >
      {label}
    </span>
  );
}
