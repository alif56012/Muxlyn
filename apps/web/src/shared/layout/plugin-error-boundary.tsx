import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class PluginErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PluginErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="p-6 text-center">
            <div className="inline-flex flex-col items-center gap-2 rounded-md border p-6">
              <h3 className="text-sm font-semibold">Something went wrong</h3>
              <p className="text-xs text-muted-foreground">
                This section failed to load. The rest of the app is unaffected.
              </p>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
