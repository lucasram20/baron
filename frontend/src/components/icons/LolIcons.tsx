import { cn } from "@/lib/utils";

export function LaneIcon({ role, className }: { role: string; className?: string }) {
  const norm = role.toLowerCase();
  if (norm === "*" || norm === "all" || norm === "fill") {
    return (
      <svg viewBox="0 0 16 16" fill="currentColor" className={cn("h-3.5 w-3.5", className)}>
        <path d="M8 1.25a.75.75 0 0 1 .75.75v2.05l1.55-.9a.75.75 0 1 1 .75 1.3L9.5 5.35l1.55.9a.75.75 0 1 1-.75 1.3l-1.55-.9V8l1.55.9a.75.75 0 1 1-.75 1.3l-1.55-.9V14a.75.75 0 0 1-1.5 0V9.3l-1.55.9a.75.75 0 1 1-.75-1.3l1.55-.9V6.65l-1.55.9a.75.75 0 0 1-.75-1.3l1.55-.9-1.55-.9a.75.75 0 0 1 .75-1.3l1.55.9V2A.75.75 0 0 1 8 1.25Z" />
      </svg>
    );
  }
  if (norm === "top") {
    return (
      <svg viewBox="0 0 16 16" className={cn("h-3.5 w-3.5", className)}>
        <path fill="currentColor" d="M2 2h10l-2 2.2H4.2V10L2 12V2Z" />
        <path fill="currentColor" opacity="0.32" d="M14 14H4l2-2.2h5.8V6L14 4v10Z" />
      </svg>
    );
  }
  if (norm === "jg" || norm === "jungle") {
    return (
      <svg viewBox="0 0 16 16" fill="currentColor" className={cn("h-3.5 w-3.5", className)}>
        <path d="M8 1.5c1.5 2.4 2.3 4.4 2.3 6.2 0 1.4-.6 2.8-1.6 3.9-.4.5-.7 1.1-.7 1.9 0-.8-.3-1.4-.7-1.9-1-1.1-1.6-2.5-1.6-3.9 0-1.8.8-3.8 2.3-6.2ZM3.1 4.2c1.2 1.2 1.9 2.8 1.9 4.5 0 1.3-.3 2.5-.9 3.6-1.3-1-2.1-2.6-2.1-4.3 0-1.5.4-2.8 1.1-3.8Zm9.8 0c.7 1 1.1 2.3 1.1 3.8 0 1.7-.8 3.3-2.1 4.3-.6-1.1-.9-2.3-.9-3.6 0-1.7.7-3.3 1.9-4.5Z" />
      </svg>
    );
  }
  if (norm === "mid") {
    return (
      <svg viewBox="0 0 16 16" className={cn("h-3.5 w-3.5", className)}>
        <path fill="currentColor" opacity="0.3" d="M2 2h7L7 4H4v3L2 9V2Zm12 12H7l2-2h3V9l2-2v7Z" />
        <path fill="currentColor" d="M13.2 1.8 14.2 2.8 2.8 14.2 1.8 13.2 13.2 1.8Z" />
      </svg>
    );
  }
  if (norm === "bot" || norm === "adc") {
    return (
      <svg viewBox="0 0 16 16" className={cn("h-3.5 w-3.5", className)}>
        <path fill="currentColor" opacity="0.32" d="M2 2h10l-2 2.2H4.2V10L2 12V2Z" />
        <path fill="currentColor" d="M14 14H4l2-2.2h5.8V6L14 4v10Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={cn("h-3.5 w-3.5", className)}>
      <path d="M8 2.2 11 4.5 9.6 8.3h2.9L8 14 3.5 8.3h2.9L5 4.5 8 2.2ZM1.8 5.2l2.6.9-.6 2.1-2-.7V5.2Zm12.4 0v2.3l-2 .7-.6-2.1 2.6-.9Z" />
    </svg>
  );
}

export function RankCrest({
  tier,
  className,
}: {
  tier: "CHALLENGER" | "GRANDMASTER" | "MASTER" | "DIAMOND" | "EMERALD" | string;
  className?: string;
}) {
  const up = tier.toUpperCase();
  const colors =
    up.includes("CHALLENGER")
      ? { primary: "#38BDF8", secondary: "#F59E0B", core: "#E0F2FE" }
      : up.includes("GRANDMASTER")
        ? { primary: "#F43F5E", secondary: "#FB7185", core: "#FFE4E6" }
        : up.includes("MASTER")
          ? { primary: "#A855F7", secondary: "#C084FC", core: "#F3E8FF" }
          : up.includes("DIAMOND") || up.startsWith("D")
            ? { primary: "#60A5FA", secondary: "#38BDF8", core: "#EFF6FF" }
            : { primary: "#10B981", secondary: "#34D399", core: "#ECFDF5" };

  return (
    <svg viewBox="0 0 28 28" fill="none" className={cn("h-6 w-6 shrink-0", className)}>
      <path
        d="M14 2.2 21.5 6.8 24 14 18.8 22.8 14 26 9.2 22.8 4 14 6.5 6.8 14 2.2Z"
        fill={colors.primary}
        fillOpacity="0.18"
        stroke={colors.primary}
        strokeWidth="1.5"
      />
      <path
        d="M14 5.5 19.2 9.4 17.5 18.2 14 22.2 10.5 18.2 8.8 9.4 14 5.5Z"
        fill={colors.secondary}
        fillOpacity="0.45"
        stroke={colors.core}
        strokeWidth="1.1"
      />
      <path d="M14 8.8 16.3 13 14 17.6 11.7 13 14 8.8Z" fill={colors.core} />
    </svg>
  );
}

export function ObjectiveBadge({
  kind,
  count,
  team,
}: {
  kind: "tower" | "grub" | "herald" | "dragon" | "baron";
  count: number;
  team: "blue" | "red";
}) {
  const tint = team === "blue" ? "text-baron-victory" : "text-baron-defeat";
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-baron-ink-secondary">
      <svg viewBox="0 0 16 16" fill="currentColor" className={cn("h-3 w-3", tint)}>
        {kind === "tower" && (
          <path d="M5 2h2v1.5h2V2h2v3l-1 1v6l1.5 2h-7L6 12V6L5 5V2Z" />
        )}
        {kind === "grub" && (
          <path d="M8 2.5c2.8 0 4.5 2 4.5 4.8 0 2.9-1.7 5.7-4.5 5.7s-4.5-2.8-4.5-5.7C3.5 4.5 5.2 2.5 8 2.5Zm-1.7 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm3.4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
        )}
        {kind === "herald" && (
          <path d="M8 2 13 5.5 11.4 13H4.6L3 5.5 8 2Zm0 3.2a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2Z" />
        )}
        {kind === "dragon" && (
          <path d="M2.5 4.5 6.8 6 8 2.2 9.2 6l4.3-1.5-2.1 4.1 2 4.4-5.4-1.8L2.6 13l2-4.4-2.1-4.1Z" />
        )}
        {kind === "baron" && (
          <path d="M2.2 4 5.5 6.5 8 2l2.5 4.5L13.8 4l-1.5 8.5H3.7L2.2 4Zm3.8 4.2a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
        )}
      </svg>
      <span>{count}</span>
    </span>
  );
}

export function RarityDiamond({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" className={cn("h-2.5 w-2.5 shrink-0", className)}>
      <path d="M6 0.8 11.2 6 6 11.2 0.8 6 6 0.8Z" />
    </svg>
  );
}
