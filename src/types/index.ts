export interface WhoopData {
  recovery: number | null;
  hrv: number | null;
  rhr: number | null;
  strain: number | null;
}

export interface DayPlan {
  dayName: string;
  content: string;
}

export interface WeekPlan {
  weekDate: string;
  overview: string;
  days: DayPlan[];
  notes: string;
}

export type RecoveryZone = 'green' | 'yellow' | 'red';

export interface RecoveryZoneInfo {
  zone: RecoveryZone;
  color: string;
  label: string;
  guidance: string;
}

export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export type DayName = (typeof DAY_NAMES)[number];
