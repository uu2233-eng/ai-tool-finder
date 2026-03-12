"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-dvh flex-col items-center justify-center bg-gray-50 p-6 dark:bg-gray-950">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-3xl text-white shadow-lg">
            !
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">
            Something went wrong
          </h2>
          <p className="mb-6 max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
