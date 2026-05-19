import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      error
    };
  }

  componentDidCatch(error, info) {
    console.error("Frontend render error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
          <div className="max-w-3xl w-full rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-black text-red-600 uppercase">Frontend error</p>
            <h1 className="mt-2 text-2xl font-black text-slate-900">The page could not render.</h1>
            <pre className="mt-4 max-h-[420px] overflow-auto rounded-2xl bg-slate-950 p-4 text-sm text-red-100">
              {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
