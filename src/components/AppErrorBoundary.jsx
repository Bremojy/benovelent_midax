import { Component } from "react";

const styles = {
  screen: {
    minHeight: "100vh",
    boxSizing: "border-box",
    display: "grid",
    placeItems: "center",
    padding: "clamp(18px, 4vw, 36px)",
    background: "radial-gradient(circle at top right, rgba(232,117,26,.14), transparent 36%), #f6f7f9",
    color: "#252525",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  card: {
    width: "min(100%, 620px)",
    boxSizing: "border-box",
    padding: "clamp(22px, 5vw, 42px)",
    borderRadius: 22,
    background: "#fff",
    border: "1px solid rgba(37,37,37,.08)",
    boxShadow: "0 18px 56px rgba(15, 23, 42, .12)",
  },
  symbol: {
    width: 52,
    height: 52,
    display: "grid",
    placeItems: "center",
    borderRadius: 15,
    background: "#fff0e4",
    color: "#c75c10",
    fontSize: 28,
    fontWeight: 800,
    marginBottom: 18,
  },
  label: {
    margin: 0,
    color: "#c75c10",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: ".13em",
    textTransform: "uppercase",
  },
  heading: { margin: "8px 0 12px", fontSize: "clamp(26px, 5vw, 38px)", lineHeight: 1.15 },
  paragraph: { lineHeight: 1.65, color: "#4b5563" },
  technical: {
    display: "block",
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    background: "#f3f4f6",
    color: "#374151",
    overflowWrap: "anywhere",
    whiteSpace: "pre-wrap",
    fontSize: 12,
  },
  actions: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 },
  primaryButton: {
    minHeight: 46,
    padding: "0 18px",
    border: 0,
    borderRadius: 12,
    background: "#e8751a",
    color: "#fff",
    fontWeight: 750,
    cursor: "pointer",
  },
  secondaryButton: {
    minHeight: 46,
    padding: "0 18px",
    border: "1px solid #d1d5db",
    borderRadius: 12,
    background: "#fff",
    color: "#374151",
    fontWeight: 700,
    cursor: "pointer",
  },
};

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: String(error?.message || "An unexpected application error occurred.").slice(0, 600),
    };
  }

  componentDidCatch(error, info) {
    // Keep diagnostics in the browser console for support without exposing
    // account information or stack traces in the normal page content.
    console.error("BENEvolent MIDAX UI error:", error, info);
  }

  retry = () => this.setState({ hasError: false, message: "" });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main style={styles.screen} role="alert" aria-live="assertive">
        <section style={styles.card}>
          <div style={styles.symbol} aria-hidden="true">!</div>
          <p style={styles.label}>BENEvolent MIDAX</p>
          <h1 style={styles.heading}>This page encountered an error</h1>
          <p style={styles.paragraph}>
            The application could not finish rendering this view. Your account and scheme data have not been intentionally changed.
            You can retry the view or reload the application.
          </p>
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Technical details</summary>
            <code style={styles.technical}>{this.state.message || "No additional details were provided."}</code>
          </details>
          <div style={styles.actions}>
            <button type="button" style={styles.primaryButton} onClick={this.retry}>Try again</button>
            <button type="button" style={styles.secondaryButton} onClick={this.retry}>Reset this view</button>
          </div>
        </section>
      </main>
    );
  }
}
