"use client";

import { useEffect } from "react";

export function DisableContextMenu() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, {
        capture: true,
      });
    };
  }, []);

  return null;
}
