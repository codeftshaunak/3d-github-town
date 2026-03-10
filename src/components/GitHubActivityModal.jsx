import { useState, useEffect } from "react";

export default function GitHubActivityModal({ user, onClose }) {
  const [activity, setActivity] = useState([]);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchGitHubData = async () => {
      setLoading(true);
      try {
        const token = import.meta.env.VITE_GITHUB_TOKEN;
        const headers = token
          ? {
              Authorization: `token ${token}`,
              Accept: "application/vnd.github.v3+json",
            }
          : {};

        // Fetch recent events/activity
        const eventsResponse = await fetch(
          `https://api.github.com/users/${user.login}/events/public?per_page=10`,
          { headers },
        );
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          setActivity(eventsData);
        }

        // Fetch top repositories
        const reposResponse = await fetch(
          `https://api.github.com/users/${user.login}/repos?sort=updated&per_page=6`,
          { headers },
        );
        if (reposResponse.ok) {
          const reposData = await reposResponse.json();
          setRepos(reposData);
        }
      } catch (error) {
        console.error("Error fetching GitHub data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGitHubData();
  }, [user]);

  if (!user) return null;

  const formatEventType = (type) => {
    const types = {
      PushEvent: "📝 Pushed code",
      CreateEvent: "✨ Created",
      WatchEvent: "⭐ Starred",
      ForkEvent: "🍴 Forked",
      PullRequestEvent: "🔀 Pull Request",
      IssuesEvent: "🐛 Issue",
      IssueCommentEvent: "💬 Commented",
    };
    return types[type] || type;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-br from-blue-900/60 via-slate-800 to-slate-900 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e3a5f2e_1px,transparent_1px),linear-gradient(to_bottom,#1e3a5f2e_1px,transparent_1px)] bg-[size:20px_20px]"></div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-slate-800/80 hover:bg-slate-700 border border-slate-600/50 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-all duration-200"
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

          {/* User Info */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end gap-4 p-6 bg-gradient-to-t from-slate-900/95 to-transparent">
            <img
              src={user.avatar_url}
              alt={user.login}
              className="w-20 h-20 rounded-full border-4 border-slate-900 shadow-xl"
            />
            <div className="flex-1 pb-2">
              <h2 className="text-2xl font-bold text-white mb-1">
                {user.name || user.login}
              </h2>
              <p className="text-blue-400 text-sm">@{user.login}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-blue-400">⚡</span> Recent Activity
                </h3>
                <div className="space-y-3">
                  {activity.length > 0 ? (
                    activity.slice(0, 8).map((event, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-800/50 border border-slate-700/40 rounded-lg hover:border-blue-500/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-300 mb-1">
                              {formatEventType(event.type)}
                            </p>
                            <p className="text-xs text-blue-400 truncate">
                              {event.repo.name}
                            </p>
                          </div>
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {formatDate(event.created_at)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm">No recent activity</p>
                  )}
                </div>
              </div>

              {/* Top Repositories */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-blue-400">📦</span> Top Repositories
                </h3>
                <div className="space-y-3">
                  {repos.length > 0 ? (
                    repos.map((repo) => (
                      <a
                        key={repo.id}
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-slate-800/50 border border-slate-700/40 rounded-lg hover:border-blue-500/40 hover:bg-slate-800/70 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-sm font-semibold text-white truncate">
                            {repo.name}
                          </h4>
                          <div className="flex items-center gap-1 text-xs text-yellow-400">
                            <span>⭐</span>
                            <span>{repo.stargazers_count}</span>
                          </div>
                        </div>
                        {repo.description && (
                          <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                            {repo.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {repo.language && (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                              {repo.language}
                            </span>
                          )}
                          <span>🍴 {repo.forks_count}</span>
                        </div>
                      </a>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm">No repositories</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-800/40 border border-slate-700/40 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-400">
                {user.public_repos}
              </div>
              <div className="text-xs text-slate-500 mt-1">Repositories</div>
            </div>
            <div className="p-4 bg-slate-800/40 border border-slate-700/40 rounded-lg text-center">
              <div className="text-2xl font-bold text-cyan-400">
                {user.followers}
              </div>
              <div className="text-xs text-slate-500 mt-1">Followers</div>
            </div>
            <div className="p-4 bg-slate-800/40 border border-slate-700/40 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-400">
                {user.following}
              </div>
              <div className="text-xs text-slate-500 mt-1">Following</div>
            </div>
            <div className="p-4 bg-slate-800/40 border border-slate-700/40 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-400">
                {user.public_gists}
              </div>
              <div className="text-xs text-slate-500 mt-1">Gists</div>
            </div>
          </div>

          {/* Visit Profile Button */}
          <div className="mt-6">
            <a
              href={user.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-base font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/50 hover:scale-[1.02] transition-all duration-300 active:scale-95"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>Visit GitHub Profile</span>
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
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
