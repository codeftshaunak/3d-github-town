import { useState } from "react";
import { useGitHub } from "../context/GitHubContext";
import logo from "../assets/logo.png";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const { searchUser, searchLoading, error, setError } = useGitHub();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      searchUser(query.trim());
    }
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    if (error) setError(null);
  };

  return (
    <div className="absolute top-20 left-4 z-20 w-full max-w-md px-4">
      {/* Logo */}
      <div className="flex justify-center mb-4">
        <img src={logo} alt="Git Town Logo" className="h-32 w-auto" />
      </div>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition-opacity duration-300"></div>

          <div className="relative flex items-center bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
            {/* Search icon */}
            <div className="pl-4 pr-2">
              <svg
                className="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <input
              type="text"
              value={query}
              onChange={handleChange}
              placeholder="Search GitHub username..."
              className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 py-4 px-2 text-sm font-medium focus:outline-none"
            />

            {/* Clear button */}
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setError(null);
                }}
                className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}

            {/* Search button */}
            <button
              type="submit"
              disabled={searchLoading || !query.trim()}
              className="m-1.5 px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-1"
            >
              {searchLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Finding...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span>Find</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-3 flex items-center gap-2 bg-red-950/80 backdrop-blur-sm border border-red-800/50 rounded-xl px-4 py-3">
            <svg
              className="w-4 h-4 text-red-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
      </form>

      {/* Quick search suggestions */}
      <div className="mt-3 flex flex-wrap gap-2 justify-center">
        {["torvalds", "gaearon", "sindresorhus", "yyx990803"].map((name) => (
          <button
            key={name}
            onClick={() => {
              setQuery(name);
              searchUser(name);
            }}
            className="px-3 py-1 bg-slate-900/70 backdrop-blur-sm border border-slate-700/50 rounded-lg text-xs text-slate-400 hover:text-blue-400 hover:border-blue-500/50 transition-all duration-200"
          >
            @{name}
          </button>
        ))}
      </div>
    </div>
  );
}
