"use client";

import React, { useState } from "react";
import { motion, useAnimate } from "motion/react";
import { cn } from "@/lib/utils";

interface StatefulButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "onClick" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"
  > {
  className?: string;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => Promise<boolean | void> | boolean | void;
}

export const StatefulButton = ({
  className,
  children,
  onClick,
  disabled,
  type = "button",
  ...buttonProps
}: StatefulButtonProps) => {
  const [scope, animate] = useAnimate();
  const [busy, setBusy] = useState(false);

  const animateLoading = async () => {
    await animate(
      ".loader",
      { width: "15px", scale: 1, display: "block" },
      { duration: 0.16 },
    );
  };

  const hideLoader = async () => {
    await animate(
      ".loader",
      { width: "0px", scale: 0, display: "none" },
      { duration: 0.16 },
    );
  };

  const animateSuccess = async () => {
    await hideLoader();
    await animate(
      ".check",
      { width: "15px", scale: 1, display: "block" },
      { duration: 0.18 },
    );
    await animate(
      ".check",
      { width: "0px", scale: 0, display: "none" },
      { delay: 1.8, duration: 0.18 },
    );
  };

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || busy) return;
    setBusy(true);
    try {
      await animateLoading();
      const result = await onClick?.(event);
      if (result === false) {
        await hideLoader();
      } else {
        await animateSuccess();
      }
    } catch {
      await hideLoader();
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.button
      layout
      ref={scope}
      type={type}
      disabled={disabled || busy}
      className={cn(
        "relative inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-baron-accent px-3.5 text-[12px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_12px_-4px_rgba(0,0,0,0.45)] transition-[filter,transform,opacity] duration-150 hover:brightness-110 active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-baron-accent disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...buttonProps}
      onClick={handleClick}
    >
      <motion.div layout className="flex items-center gap-1.5">
        <Loader />
        <CheckIcon />
        <motion.span layout className="inline-flex items-center gap-1.5">
          {children}
        </motion.span>
      </motion.div>
    </motion.button>
  );
};

export { StatefulButton as Button };

const Loader = () => (
  <motion.svg
    animate={{ rotate: [0, 360] }}
    initial={{ scale: 0, width: 0, display: "none" }}
    style={{ scale: 0.5, display: "none" }}
    transition={{ duration: 0.55, repeat: Infinity, ease: "linear" }}
    xmlns="http://www.w3.org/2000/svg"
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="loader shrink-0 text-white"
    aria-hidden="true"
  >
    <path d="M12 3a9 9 0 1 0 9 9" />
  </motion.svg>
);

const CheckIcon = () => (
  <motion.svg
    initial={{ scale: 0, width: 0, display: "none" }}
    style={{ scale: 0.5, display: "none" }}
    xmlns="http://www.w3.org/2000/svg"
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="check shrink-0 text-white"
    aria-hidden="true"
  >
    <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
    <path d="M9 12l2 2l4 -4" />
  </motion.svg>
);
