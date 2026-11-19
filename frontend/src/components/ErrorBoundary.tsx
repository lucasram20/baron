"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  resetKey?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class ErrorBoundaryInner extends Component<
  { children: ReactNode; onReset?: () => void },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unexpected rendering error.",
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error("Baron view ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div role="alert" className="m-5 rounded-xl border border-baron-border bg-baron-surface p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-baron-gold" />
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-extrabold text-baron-ink">
              View Encountered an Unexpected Payload
            </h2>
            <p className="mt-1 text-[12px] text-baron-ink-secondary">
              Baron caught a rendering error before it could interrupt the app:
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-baron-border bg-baron-inset px-3 py-2 font-mono text-[11px] text-baron-ink-muted">
              {this.state.message}
            </pre>
            <div className="mt-4 flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  this.setState({ hasError: false, message: "" });
                  this.props.onReset?.();
                }}
                className="h-8 gap-1.5 bg-baron-accent px-3 text-[12px] font-semibold text-white"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Reload View</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export function ErrorBoundary({ children, resetKey = "default", onReset }: ErrorBoundaryProps) {
  return (
    <ErrorBoundaryInner key={resetKey} onReset={onReset}>
      {children}
    </ErrorBoundaryInner>
  );
}
