"use client";

import { Component, type ReactNode } from "react";

type Props = {
  fallback: ReactNode;
  onError?: (error: Error) => void;
  children: ReactNode;
};

/** Minimal error boundary usable both inside and outside the R3F tree. */
export class SceneErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
