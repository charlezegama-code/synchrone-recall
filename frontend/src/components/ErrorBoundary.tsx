import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

type Props = { children: ReactNode; label?: string };
type State = { error: Error | null };

/**
 * Last line of defence: an uncaught render/effect error unmounts the whole
 * React tree and leaves a blank page. This catches it and shows the error
 * text plus a reload button so it is at least diagnosable.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.label ?? "app"}]`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        <AlertCircle size={28} className="text-red-500" />
        <h2 className="mt-4 text-[20px] font-bold text-rhino">Something broke on this page</h2>
        <p className="mt-2 break-words text-[13px] leading-[1.6] text-rhino/55">{this.state.error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 flex min-h-[44px] items-center gap-2 rounded-full bg-rhino px-5 text-[14px] font-semibold text-white"
        >
          <RotateCcw size={14} /> Reload
        </button>
      </div>
    );
  }
}
