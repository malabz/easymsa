import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./Button";

type Props = {
  children: ReactNode;
  title: string;
  description: string;
  retryLabel: string;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("EasyMSA render error", error, info);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <section className="mx-auto my-16 max-w-2xl rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm" role="alert">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-700">
          {this.props.title}
        </p>
        <p className="mt-3 text-sm leading-6 text-rose-900">
          {this.props.description}
        </p>
        <Button className="mt-6" onClick={this.reset}>
          {this.props.retryLabel}
        </Button>
      </section>
    );
  }
}
