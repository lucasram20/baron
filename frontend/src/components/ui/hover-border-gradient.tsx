"use client";

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

const DIRECTIONS: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];

const MOVING_MAP: Record<Direction, string> = {
  TOP: "radial-gradient(20.7% 50% at 50% 0%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)",
  LEFT: "radial-gradient(16.6% 43.1% at 0% 50%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)",
  BOTTOM: "radial-gradient(20.7% 50% at 50% 100%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)",
  RIGHT: "radial-gradient(16.2% 41.2% at 100% 50%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)",
};

const HIGHLIGHT =
  "radial-gradient(75% 181.16% at 50% 50%, #6366F1 0%, rgba(99, 102, 241, 0) 100%)";

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = "button",
  duration = 1.2,
  clockwise = true,
  ...props
}: React.PropsWithChildren<
  {
    as?: React.ElementType;
    containerClassName?: string;
    className?: string;
    duration?: number;
    clockwise?: boolean;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>) {
  const [hovered, setHovered] = useState(false);
  const [direction, setDirection] = useState<Direction>("TOP");

  const rotateDirection = useCallback(
    (current: Direction): Direction => {
      const idx = DIRECTIONS.indexOf(current);
      const next = clockwise
        ? (idx - 1 + DIRECTIONS.length) % DIRECTIONS.length
        : (idx + 1) % DIRECTIONS.length;
      return DIRECTIONS[next];
    },
    [clockwise],
  );

  useEffect(() => {
    if (hovered) return undefined;
    const interval = setInterval(() => {
      setDirection((prev) => rotateDirection(prev));
    }, duration * 1000);
    return () => clearInterval(interval);
  }, [hovered, duration, rotateDirection]);

  return (
    <Tag
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative flex h-min w-fit flex-col items-center justify-center overflow-visible rounded-lg border border-baron-border bg-baron-elevated/80 p-px transition duration-300",
        containerClassName,
      )}
      {...props}
    >
      <div
        className={cn(
          "relative z-10 flex items-center gap-1.5 rounded-[inherit] bg-baron-elevated px-3 py-1.5 text-xs font-semibold text-baron-ink",
          className,
        )}
      >
        {children}
      </div>
      <motion.div
        className="absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
        style={{ filter: "blur(2px)" }}
        initial={{ background: MOVING_MAP[direction] }}
        animate={{
          background: hovered ? [MOVING_MAP[direction], HIGHLIGHT] : MOVING_MAP[direction],
        }}
        transition={{ ease: "linear", duration }}
      />
      <div className="bg-baron-elevated absolute inset-[1px] z-[1] rounded-[inherit]" />
    </Tag>
  );
}
