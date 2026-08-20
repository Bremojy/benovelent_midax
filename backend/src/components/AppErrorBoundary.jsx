import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "An unexpected error occurred.",
    };
  }

  componentDidCatch(error, info) {
    console.error("Benovelent UI error:", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="app-error-screen" role="alert">
        <div className="app-error-card">
          <div className="app-error-icon" aria-hidden="true"><AlertTriangle size={28} /></div>
          <span className="section-label">BENOVELENT MIDAX</span>
          <h1>Something went wrong</h1>
          <p>
            This page hit an unexpected error. Your account data has not been intentionally removed.
            Refresh the page or try again.
          </p>
          <details>
            <summary>Technical details</summary>
            <code>{this.state.message}</code>
          </details>
          <div className="app-error-actions">
            <button type="button" onClick={this.reset}><RefreshCw size={17} /> Try again</button>
            <button type="button" className="secondary" onClick={() => window.location.reload()}>Refresh page</button>
          </div>
        </div>
      </main>
    );
  }
}
