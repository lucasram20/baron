"use client";

import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function ScoreRing({ score, size = "sm", label }: ScoreRingProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const strokeColor =
    clamped >= 85
      ? "var(--baron-gold)"
      : clamped >= 70
        ? "var(--baron-cyan)"
        : clamped >= 55
          ? "var(--baron-accent-soft)"
          : "var(--baron-ink-muted)";

  const dim = size === "lg" ? 54 : size === "md" ? 42 : 32;
  const r = size === "lg" ? 22 : size === "md" ? 17 : 13;
  const strokeWidth = size === "lg" ? 3.2 : size === "md" ? 2.8 : 2.4;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center tabular-nums"
      style={{ width: dim, height: dim }}
      title={label ?? `Baron Score: ${score}`}
    >
      <svg width={dim} height={dim} className="-rotate-90" aria-hidden="true">
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          className="fill-baron-surface stroke-baron-border"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className={cn(
          "absolute font-extrabold text-baron-ink",
          size === "lg" ? "text-[15px]" : size === "md" ? "text-xs" : "text-[11px]",
        )}
      >
        {score}
      </span>
    </div>
  );
}
