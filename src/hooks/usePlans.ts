import { useState, useEffect, useCallback } from 'react';
import type { WeekPlan } from '../types';
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

function buildEntries(filenames: string[]): PlanEntry[] {
  return filenames
    .map((filename) => ({
      weekDate: extractWeekDate(filename),
      filename,
    }))
    .filter((e) => e.weekDate !== '')
    .sort((a, b) => b.weekDate.localeCompare(a.weekDate));
}

export function usePlans() {
  const [availableWeeks, setAvailableWeeks] = useState<PlanEntry[]>([]);
  const [currentPlan, setCurrentPlan] = useState<WeekPlan | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshPlanList = useCallback(async () => {
    try {
      const res = await fetch('/api/plans');
      if (res.ok) {
        const data = await res.json();
        setAvailableWeeks(buildEntries(data.plans));
        return;
      }
    } catch {
      // Server unavailable — fall back to static manifest
    }
    setAvailableWeeks(buildEntries(PLAN_MANIFEST));
  }, []);

  useEffect(() => {
    refreshPlanList();
  }, [refreshPlanList]);

  const loadPlan = useCallback(async (weekDate: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/plans/workout-plan-${weekDate}.md`);
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

  return { availableWeeks, currentPlan, loadPlan, loading, refreshPlanList };
}
