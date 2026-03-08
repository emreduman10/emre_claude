import { RecoveryZoneInfo } from '../types';

export const RECOVERY_ZONES: RecoveryZoneInfo[] = [
  {
    zone: 'green',
    color: '#4CAF50',
    label: 'Green (67–100%)',
    guidance: 'High intensity — heavy compounds, 3–8 reps',
  },
  {
    zone: 'yellow',
    color: '#FFC107',
    label: 'Yellow (34–66%)',
    guidance: 'Moderate — 8–12 reps, 75% volume',
  },
  {
    zone: 'red',
    color: '#F44336',
    label: 'Red (0–33%)',
    guidance: 'Active recovery only',
  },
];

export const FIXED_CONSTRAINTS = {
  tuesdayActivity: 'Soccer',
  lowerBackNote:
    'Avoid heavy barbell squats and deadlifts after poor recovery days (red zone).',
};

export const PLAN_MANIFEST = [
  'workout-plan-2026-03-02.md',
  'workout-plan-2026-03-09.md',
];
