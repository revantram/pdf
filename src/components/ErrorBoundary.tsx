import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
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
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="liquid-glass w-full max-w-md rounded-3xl p-6 text-center space-y-4 border border-white/20 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-ios-pink/15 text-ios-pink flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {this.props.fallbackTitle || 'Tool Execution Error'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-h-24 overflow-y-auto px-2 break-words">
                {this.state.error?.message || 'An unexpected error occurred while rendering this tool.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Tools
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-ios-blue text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-ios-blue/30 hover:bg-ios-blue/90 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
