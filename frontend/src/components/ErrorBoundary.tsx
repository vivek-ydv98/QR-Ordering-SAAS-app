'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught component tree crash:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-slate-50 dark:bg-slate-950 font-sans">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl shadow-slate-100 dark:shadow-none flex flex-col items-center">
            
            <div className="bg-rose-500/10 border border-rose-500/25 p-5 rounded-2xl mb-6 flex items-center justify-center">
              <AlertTriangle className="w-12 h-12 text-rose-500" />
            </div>

            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Oops! Something went wrong
            </h1>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              We've encountered an unexpected component rendering error. You can try refreshing the page to recover.
            </p>

            <button
              onClick={() => window.location.reload()}
              className="mt-6 flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3 px-4 rounded-xl transition-all shadow-md active:scale-[0.98]"
            >
              <RefreshCcw className="w-4 h-4" />
              Reload Page
            </button>

            {this.state.error && (
              <details className="mt-6 w-full text-left bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden">
                <summary className="cursor-pointer text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest p-3 select-none hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors">
                  Technical details
                </summary>
                <div className="p-4 border-t border-slate-100 dark:border-slate-850">
                  <pre className="text-[10px] font-mono text-rose-600 dark:text-rose-400 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-40">
                    {this.state.error.name}: {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </div>
              </details>
            )}

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
