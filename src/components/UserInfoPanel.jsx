import { useGitHub } from '../context/GitHubContext';

export default function UserInfoPanel() {
  const { selectedUser, setSelectedUser } = useGitHub();

  if (!selectedUser) return null;

  const user = selectedUser;
  const joinYear = user.created_at ? new Date(user.created_at).getFullYear() : 'N/A';

  const stats = [
    { label: 'Repositories', value: user.public_repos || 0, icon: '📦', color: 'text-blue-400' },
    { label: 'Followers', value: formatNumber(user.followers || 0), icon: '👥', color: 'text-cyan-400' },
    { label: 'Following', value: user.following || 0, icon: '➡️', color: 'text-purple-400' },
    { label: 'Gists', value: user.public_gists || 0, icon: '📝', color: 'text-green-400' },
  ];

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-80">
      {/* Glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-b from-blue-600/30 to-cyan-600/20 rounded-2xl blur-sm"></div>
      
      <div className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
        {/* Header gradient */}
        <div className="h-24 bg-gradient-to-br from-blue-900/60 via-slate-800 to-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e3a5f2e_1px,transparent_1px),linear-gradient(to_bottom,#1e3a5f2e_1px,transparent_1px)] bg-[size:20px_20px]"></div>
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900/95 to-transparent"></div>
          
          {/* Close button */}
          <button
            onClick={() => setSelectedUser(null)}
            className="absolute top-3 right-3 w-7 h-7 bg-slate-800/80 hover:bg-slate-700 border border-slate-600/50 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Building indicator */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg px-2 py-1">
            <div className="w-2 h-2 rounded-sm bg-blue-400"></div>
            <span className="text-blue-300 text-xs font-medium">Building Selected</span>
          </div>
        </div>

        {/* Avatar */}
        <div className="flex justify-center -mt-12 relative z-10 mb-3">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-sm opacity-70"></div>
            <img
              src={user.avatar_url}
              alt={user.login}
              className="relative w-20 h-20 rounded-full border-3 border-slate-900 shadow-xl"
            />
            {/* Online indicator */}
            <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 shadow-lg"></div>
          </div>
        </div>

        {/* User info */}
        <div className="px-5 pb-5">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-white mb-0.5">
              {user.name || user.login}
            </h2>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-blue-400 text-sm font-medium">@{user.login}</span>
              {user.type === 'Organization' && (
                <span className="px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded text-purple-300 text-xs">Org</span>
              )}
            </div>
            
            {user.bio && (
              <p className="text-slate-400 text-xs mt-2 leading-relaxed line-clamp-2">
                {user.bio}
              </p>
            )}
          </div>

          {/* Details */}
          <div className="space-y-2 mb-4">
            {user.company && (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <svg className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="truncate">{user.company}</span>
              </div>
            )}
            {user.location && (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <svg className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{user.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <svg className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Member since {joinYear}</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 text-center">
                <div className="text-lg mb-0.5">{stat.icon}</div>
                <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-slate-500 text-xs">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Building height indicator */}
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-xs font-medium">Building Height</span>
              <span className="text-blue-400 text-xs font-bold">
                {Math.round(getBuildingHeight(user))}m
              </span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (getBuildingHeight(user) / 25) * 100)}%` }}
              ></div>
            </div>
            <p className="text-slate-500 text-xs mt-1.5">Based on followers & repos</p>
          </div>

          {/* GitHub link */}
          <a
            href={user.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/50 hover:scale-[1.02] transition-all duration-300 active:scale-95"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            View GitHub Profile
          </a>
        </div>
      </div>
    </div>
  );
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function getBuildingHeight(user) {
  const followers = user.followers || 0;
  const repos = user.public_repos || 0;
  const base = 4;
  const followerHeight = Math.log10(Math.max(1, followers)) * 3;
  const repoHeight = Math.log10(Math.max(1, repos)) * 2;
  return Math.min(25, base + followerHeight + repoHeight);
}