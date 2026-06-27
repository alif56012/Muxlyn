import i18next from 'i18next';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen items-center justify-center px-6 py-12">
            <div className="w-full max-w-md space-y-4 text-center">
              <h1 className="text-heading-md font-semibold">{i18next.t('error.title')}</h1>
              <p className="text-sm text-muted-foreground">{i18next.t('error.desc')}</p>
              <button
                type="button"
                onClick={() => {
                  this.setState({ error: null });
                  window.location.reload();
                }}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {i18next.t('error.reload')}
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
