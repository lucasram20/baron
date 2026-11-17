"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface AnimatedTabOption<T extends string = string> {
  id: T;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
}

interface AnimatedTabsProps<T extends string = string> {
  items: AnimatedTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  layoutId: string;
  ariaLabel: string;
  className?: string;
}

export function AnimatedTabs<T extends string = string>({
  items,
  value,
  onChange,
  layoutId,
  ariaLabel,
  className,
}: AnimatedTabsProps<T>) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-baron-border bg-baron-elevated/80 p-0.5",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-baron-accent",
              active ? "text-white" : "text-baron-ink-secondary hover:text-baron-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 500, damping: 38, mass: 0.6 }
                }
                className="absolute inset-0 rounded-md bg-baron-accent shadow-xs"
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={cn(
                    "text-[10px] tabular-nums",
                    active ? "text-white/80" : "text-baron-ink-muted",
                  )}
                >
                  {item.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
