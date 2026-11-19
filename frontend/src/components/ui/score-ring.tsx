"use client";

import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function ScoreRing({ score, size = "sm", label }: ScoreRingProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const strokeColor =
    clamped >= 85
      ? "var(--baron-gold)"
      : clamped >= 70
        ? "var(--baron-victory)"
        : clamped >= 55
          ? "var(--baron-accent-soft)"
          : "var(--baron-ink-muted)";

  const sizeClass =
    size === "lg"
      ? "size-[56px] text-[15px]"
      : size === "md"
        ? "size-[42px] text-[12px]"
        : "size-[34px] text-[11px]";

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center rounded-full bg-baron-surface/80 tabular-nums"
      title={label ?? `Baron Score: ${clamped}`}
      aria-label={label ?? `Baron Score: ${clamped}`}
    >
      <AnimatedCircularProgressBar
        max={100}
        min={0}
        value={clamped}
        gaugePrimaryColor={strokeColor}
        gaugeSecondaryColor="var(--baron-border)"
        className={cn(sizeClass, "font-extrabold text-baron-ink")}
      />
    </div>
  );
}
