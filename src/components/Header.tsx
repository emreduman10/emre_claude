import { useAuth } from '../context/AuthContext';
import { useWhoopData } from '../hooks/useWhoopData';
import { getRecoveryZone } from '../utils/recoveryZone';

export function Header() {
  const { isAuthenticated, loading: authLoading, logout } = useAuth();
  const { recovery, hrv, rhr, strain, loading: whoopLoading } = useWhoopData();
  const zone = getRecoveryZone(recovery);

  const formatValue = (val: number | null, suffix = '') =>
    val !== null ? `${val}${suffix}` : '—';

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <h1 className="text-lg font-bold tracking-tight">
          Weekly Workout Planner
        </h1>

        <div className="flex items-center gap-6 text-sm">
          {authLoading ? (
            <span className="text-gray-500 animate-pulse">Loading...</span>
          ) : !isAuthenticated ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.assign('http://localhost:3001/api/auth/login');
              }}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer border-none"
            >
              Sign in with WHOOP
            </button>
          ) : whoopLoading ? (
            <span className="text-gray-500 animate-pulse">
              Loading WHOOP data...
            </span>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Recovery</span>
                <span
                  className="font-bold text-base px-2 py-0.5 rounded"
                  style={{
                    color: recovery !== null ? zone.color : undefined,
                    backgroundColor:
                      recovery !== null ? `${zone.color}20` : undefined,
                  }}
                >
                  {formatValue(recovery, '%')}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-gray-400">HRV</span>
                <span className="font-semibold">{formatValue(hrv, 'ms')}</span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-gray-400">RHR</span>
                <span className="font-semibold">
                  {formatValue(rhr, 'bpm')}
                </span>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <span className="text-gray-400">Strain</span>
                <span className="font-semibold">{formatValue(strain)}</span>
              </div>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
