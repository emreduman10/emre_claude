import type { RecoveryZone, RecoveryZoneInfo } from '../types';
import { RECOVERY_ZONES } from '../config/training';

export function getRecoveryZone(score: number | null): RecoveryZoneInfo {
  if (score === null || score < 0) return RECOVERY_ZONES[2]; // red
  if (score >= 67) return RECOVERY_ZONES[0]; // green
  if (score >= 34) return RECOVERY_ZONES[1]; // yellow
  return RECOVERY_ZONES[2]; // red
}

export function getZoneColor(zone: RecoveryZone): string {
  switch (zone) {
    case 'green':
      return '#4CAF50';
    case 'yellow':
      return '#FFC107';
    case 'red':
      return '#F44336';
  }
}
