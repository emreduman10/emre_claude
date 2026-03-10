import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWhoopData } from '../hooks/useWhoopData';
import { getRecoveryZone } from '../utils/recoveryZone';

export function Header() {
  const { isAuthenticated, loading: authLoading, logout } = useAuth();
  const { recovery, hrv, rhr, strain, loading: whoopLoading } = useWhoopData();
  const zone = getRecoveryZone(recovery);

  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const formatValue = (val: number | null, suffix = '') =>
    val !== null ? `${val}${suffix}` : '—';

  const handleSignIn = async () => {
    try {
      const res = await fetch('/api/auth/url');
      const data = await res.json();
      if (data.url) {
        setAuthUrl(data.url);
      }
    } catch (err) {
      console.error('Failed to fetch auth URL:', err);
    }
  };

  const handleCopy = async () => {
    if (!authUrl) return;
    try {
      await navigator.clipboard.writeText(authUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text
      const input = document.querySelector<HTMLInputElement>('#whoop-auth-url');
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

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
            authUrl ? (
              <div className="flex items-center gap-2">
                <input
                  id="whoop-auth-url"
                  type="text"
                  readOnly
                  value={authUrl}
                  className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded border border-gray-700 w-64 font-mono"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded transition-colors cursor-pointer border-none whitespace-nowrap"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <span className="text-gray-500 text-xs">
                  Open in browser, then return here
                </span>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer border-none"
              >
                Sign in with WHOOP
              </button>
            )
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
