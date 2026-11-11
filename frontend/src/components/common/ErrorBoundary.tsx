import React from 'react';
import { reportClientError } from '@/lib/clientErrors';
import { ErrorScreen } from './ErrorScreen';

/**
 * Catches a render crash so the screen never turns white (PRACTICE_POLISH_PLAN.md §3.2).
 * Reports it once with a ref, then shows `fallback` (or the standard error screen).
 * `resetKey`: when it changes (e.g. the route), the boundary clears and tries again.
 */
interface Props {
  area: string;
  children: React.ReactNode;
  resetKey?: unknown;
  fallback?: (p: { errorRef: string; reset: () => void }) => React.ReactNode;
}
interface State { errorRef: string | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { errorRef: null };

  static getDerivedStateFromError(): State {
    return { errorRef: 'pending' };
  }

  componentDidCatch(error: Error) {
    this.setState({ errorRef: reportClientError(error, this.props.area) });
  }

  componentDidUpdate(prev: Props) {
    if (this.state.errorRef && prev.resetKey !== this.props.resetKey) this.setState({ errorRef: null });
  }

  reset = () => this.setState({ errorRef: null });

  render() {
    const { errorRef } = this.state;
    if (!errorRef) return this.props.children;
    const ref = errorRef === 'pending' ? '' : errorRef;
    if (this.props.fallback) return this.props.fallback({ errorRef: ref, reset: this.reset });
    return <ErrorScreen errorRef={ref || undefined} onRetry={this.reset} compact />;
  }
}
