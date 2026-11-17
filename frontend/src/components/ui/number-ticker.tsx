"use client";

import { type ComponentPropsWithoutRef, useEffect, useRef } from "react";
import { useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number;
  startValue?: number;
  direction?: "up" | "down";
  delay?: number;
  decimalPlaces?: number;
}

function formatTickerValue(num: number, decimalPlaces: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(Number(num.toFixed(decimalPlaces)));
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();
  const motionValue = useMotionValue(direction === "down" ? value : startValue);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 180,
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (reducedMotion) {
      if (ref.current) {
        ref.current.textContent = formatTickerValue(
          direction === "down" ? startValue : value,
          decimalPlaces,
        );
      }
      return undefined;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isInView) {
      timer = setTimeout(() => {
        motionValue.set(direction === "down" ? startValue : value);
      }, delay * 1000);
    }

    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [delay, decimalPlaces, direction, isInView, motionValue, reducedMotion, startValue, value]);

  useEffect(
    () =>
      springValue.on("change", (latest) => {
        if (ref.current && !reducedMotion) {
          ref.current.textContent = formatTickerValue(latest, decimalPlaces);
        }
      }),
    [springValue, decimalPlaces, reducedMotion],
  );

  return (
    <span
      ref={ref}
      className={cn("inline-block text-baron-ink tabular-nums", className)}
      {...props}
    >
      {formatTickerValue(reducedMotion ? value : startValue, decimalPlaces)}
    </span>
  );
}
