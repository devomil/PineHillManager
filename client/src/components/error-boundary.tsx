import { Component, ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? ` ${this.props.label}` : ""}]`, error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "monospace", background: "#fff", color: "#111", minHeight: "100vh", overflow: "auto" }}>
          <h1 style={{ color: "#b91c1c", fontSize: 20, marginBottom: 12 }}>
            Page crashed{this.props.label ? `: ${this.props.label}` : ""}
          </h1>
          <pre style={{ whiteSpace: "pre-wrap", background: "#fef2f2", padding: 12, border: "1px solid #fecaca", borderRadius: 6 }}>
            {this.state.error.name}: {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
          {this.state.info?.componentStack && (
            <>
              <h2 style={{ marginTop: 16, fontSize: 16 }}>Component stack</h2>
              <pre style={{ whiteSpace: "pre-wrap", background: "#f9fafb", padding: 12, border: "1px solid #e5e7eb", borderRadius: 6 }}>
                {this.state.info.componentStack}
              </pre>
            </>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
