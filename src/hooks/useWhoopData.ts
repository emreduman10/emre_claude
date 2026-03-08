import { useState, useEffect } from 'react';
import { WhoopData } from '../types';

const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v1';

export function useWhoopData(): WhoopData & { loading: boolean } {
  const [data, setData] = useState<WhoopData>({
    recovery: null,
    hrv: null,
    rhr: null,
    strain: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = import.meta.env.VITE_WHOOP_ACCESS_TOKEN;
    if (!token) {
      setLoading(false);
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    async function fetchWhoopData() {
      try {
        const [recoveryRes, cycleRes] = await Promise.allSettled([
          fetch(`${WHOOP_API_BASE}/recovery`, { headers }),
          fetch(`${WHOOP_API_BASE}/cycle`, { headers }),
        ]);

        let recovery: number | null = null;
        let hrv: number | null = null;
        let rhr: number | null = null;
        let strain: number | null = null;

        if (recoveryRes.status === 'fulfilled' && recoveryRes.value.ok) {
          const recoveryData = await recoveryRes.value.json();
          const latest = Array.isArray(recoveryData.records)
            ? recoveryData.records[0]
            : recoveryData;
          if (latest?.score) {
            recovery = latest.score.recovery_score ?? null;
            hrv = latest.score.hrv_rmssd_milli != null
              ? Math.round(latest.score.hrv_rmssd_milli)
              : null;
            rhr = latest.score.resting_heart_rate ?? null;
          }
        }

        if (cycleRes.status === 'fulfilled' && cycleRes.value.ok) {
          const cycleData = await cycleRes.value.json();
          const latest = Array.isArray(cycleData.records)
            ? cycleData.records[0]
            : cycleData;
          if (latest?.score) {
            strain = latest.score.strain != null
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
  }, []);

  return { ...data, loading };
}
