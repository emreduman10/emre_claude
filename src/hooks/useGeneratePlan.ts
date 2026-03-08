import { useState } from 'react';

interface GenerateResult {
  success: boolean;
  filename?: string;
  weekDate?: string;
  message?: string;
  alreadyExisted?: boolean;
  whoopSummary?: {
    avgRecovery: number | null;
    greenDays: number;
    yellowDays: number;
    redDays: number;
  };
  error?: string;
}

export function useGeneratePlan() {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);

  async function generate(): Promise<GenerateResult | null> {
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/generate-plan', { method: 'POST' });
      const data: GenerateResult = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to generate plan');
        return null;
      }

      setResult(data);
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Network error';
      setError(message);
      return null;
    } finally {
      setGenerating(false);
    }
  }

  return { generate, generating, error, result };
}
