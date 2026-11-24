import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error('DevilMotion ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center p-6 text-white font-sans">
          <div className="max-w-md w-full bg-[#121217] border border-white/10 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#F01428]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="w-16 h-16 bg-[#F01428]/10 border border-[#F01428]/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#F01428]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-xl sm:text-2xl font-black font-heading text-white mb-2 tracking-tight">
              Something Disrupted the Connection Between Realms
            </h1>
            <p className="text-sm text-[#9E9EB2] mb-6">
              A mystical fracture occurred while loading this page. Our demons have contained the rift and are restoring balance.
            </p>

            {this.state.error?.message && (
              <div className="bg-[#0A0A0C] border border-white/5 rounded-lg p-3 text-left mb-6 overflow-hidden">
                <p className="text-[11px] font-mono text-[#F01428] truncate">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#F01428] hover:bg-[#ff2b44] text-white text-sm font-bold shadow-lg shadow-[#F01428]/30 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Summon Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold border border-white/10 transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" /> Return to the Realm
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
