import { useState, useEffect, useCallback } from 'react';
import { WeekPlan } from '../types';
import { parseWeekPlan } from '../utils/markdownParser';
import { PLAN_MANIFEST } from '../config/training';

export interface PlanEntry {
  weekDate: string;
  filename: string;
}

function extractWeekDate(filename: string): string {
  const match = filename.match(/workout-plan-(\d{4}-\d{2}-\d{2})\.md/);
  return match ? match[1] : '';
}

export function usePlans() {
  const [availableWeeks, setAvailableWeeks] = useState<PlanEntry[]>([]);
  const [currentPlan, setCurrentPlan] = useState<WeekPlan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const entries: PlanEntry[] = PLAN_MANIFEST.map((filename) => ({
      weekDate: extractWeekDate(filename),
      filename,
    })).filter((e) => e.weekDate !== '');

    // Sort descending (newest first)
    entries.sort((a, b) => b.weekDate.localeCompare(a.weekDate));
    setAvailableWeeks(entries);
  }, []);

  const loadPlan = useCallback(async (weekDate: string) => {
    const entry = PLAN_MANIFEST.find((f) => f.includes(weekDate));
    if (!entry) return;

    setLoading(true);
    try {
      const response = await fetch(`/plans/${entry}`);
      if (!response.ok) throw new Error('Failed to load plan');
      const markdown = await response.text();
      const plan = parseWeekPlan(markdown, weekDate);
      setCurrentPlan(plan);
    } catch (err) {
      console.error('Failed to load plan:', err);
      setCurrentPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { availableWeeks, currentPlan, loadPlan, loading };
}
