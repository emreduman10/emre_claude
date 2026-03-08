import { useWhoopData } from '../hooks/useWhoopData';
import { getRecoveryZone } from '../utils/recoveryZone';

export function Header() {
  const { recovery, hrv, rhr, strain, loading } = useWhoopData();
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
          {loading ? (
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
            </>
          )}
        </div>
      </div>
    </header>
  );
}
