import { useState, useEffect } from 'react';
import type { WhoopData } from '../types';
import { useAuth } from '../context/AuthContext';

export function useWhoopData(): WhoopData & { loading: boolean } {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<WhoopData>({
    recovery: null,
    hrv: null,
    rhr: null,
    strain: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setData({ recovery: null, hrv: null, rhr: null, strain: null });
      setLoading(false);
      return;
    }

    setLoading(true);

    async function fetchWhoopData() {
      try {
        const [recoveryRes, cycleRes] = await Promise.allSettled([
          fetch('/api/whoop/recovery'),
          fetch('/api/whoop/cycle'),
        ]);

        let recovery: number | null = null;
        let hrv: number | null = null;
        let rhr: number | null = null;
        let strain: number | null = null;

        if (recoveryRes.status === 'fulfilled' && recoveryRes.value.ok) {
          const recoveryData = await recoveryRes.value.json();
          if (recoveryData?.score) {
            recovery = recoveryData.score.recovery_score ?? null;
            hrv =
              recoveryData.score.hrv_rmssd_milli != null
                ? Math.round(recoveryData.score.hrv_rmssd_milli)
                : null;
            rhr = recoveryData.score.resting_heart_rate ?? null;
          }
        }

        if (cycleRes.status === 'fulfilled' && cycleRes.value.ok) {
          const cycleData = await cycleRes.value.json();
          const latest = Array.isArray(cycleData.records)
            ? cycleData.records[0]
            : cycleData;
          if (latest?.score) {
            strain =
              latest.score.strain != null
                ? Math.round(latest.score.strain * 10) / 10
                : null;
          }
        }

        setData({ recovery, hrv, rhr, strain });
      } catch {
        // Graceful fallback — keep nulls
      } finally {
        setLoading(false);
      }
    }

    fetchWhoopData();
  }, [isAuthenticated]);

  return { ...data, loading };
}
