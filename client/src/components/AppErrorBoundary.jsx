import { Component } from "react";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unexpected application error." };
  }

  componentDidCatch(error, info) {
    console.error("BizLift runtime error:", error, info);
  }

  handleReload = () => window.location.reload();

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-black px-6 py-16 text-white">
        <div className="mx-auto max-w-xl rounded-[28px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#9ad17b]/20 bg-[#9ad17b]/10 text-[#9ad17b]">!</div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9ad17b]">BizLift recovery</p>
          <h1 className="mt-2 text-2xl font-semibold">This workspace hit an unexpected error.</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">Your data and backend are untouched. Reload the application to recover the current session.</p>
          <button onClick={this.handleReload} className="mt-7 rounded-xl bg-[#9ad17b] px-5 py-3 text-sm font-bold text-black transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#9ad17b]/60">Reload BizLift</button>
          {import.meta.env.DEV && this.state.message ? <pre className="mt-6 overflow-auto rounded-xl bg-black/50 p-4 text-xs text-white/45">{this.state.message}</pre> : null}
        </div>
      </main>
    );
  }
}
