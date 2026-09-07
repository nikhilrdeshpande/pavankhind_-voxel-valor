
import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Last-resort crash screen. Bilingual because it renders before/outside the
 * language context, and a crash can happen in either language mode.
 */
class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-6 bg-black p-8 text-center">
        <div className="font-cinzel text-3xl font-black tracking-widest text-orange-400">
          पावनखिंड
        </div>
        <div className="max-w-md text-orange-100/90">
          <p className="font-bold">काहीतरी चूक झाली. खिंड अजूनही उभी आहे — पुन्हा प्रयत्न करा.</p>
          <p className="mt-2 text-sm text-orange-200/70">
            Something went wrong. The pass still stands — try again.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="border border-orange-500/70 px-8 py-3 text-sm font-bold uppercase tracking-widest text-orange-200 transition-all hover:bg-orange-500 hover:text-black"
        >
          पुन्हा सुरू करा / Restart
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
