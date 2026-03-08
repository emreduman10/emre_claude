import { DAY_NAMES, DayName } from '../types';
import { useWhoopData } from '../hooks/useWhoopData';
import { getRecoveryZone } from '../utils/recoveryZone';

interface DayNavProps {
  activeDay: string;
  onSelectDay: (day: string) => void;
}

const SHORT_DAYS: Record<DayName, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

function getTodayName(): string {
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return days[new Date().getDay()];
}

export function DayNav({ activeDay, onSelectDay }: DayNavProps) {
  const { recovery } = useWhoopData();
  const zone = getRecoveryZone(recovery);
  const today = getTodayName();

  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-2">
        Days
      </h2>
      <div className="space-y-1">
        {DAY_NAMES.map((day) => {
          const isActive = activeDay.toLowerCase() === day.toLowerCase();
          const isToday = day === today;

          return (
            <button
              key={day}
              onClick={() => onSelectDay(day.toLowerCase())}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                isActive
                  ? 'bg-gray-700 text-white font-medium'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-gray-100'
              }`}
            >
              <span className="flex items-center gap-2">
                {SHORT_DAYS[day]}
                {isToday && (
                  <span className="text-[10px] bg-blue-600/30 text-blue-400 px-1.5 py-0.5 rounded font-medium">
                    TODAY
                  </span>
                )}
              </span>
              {isToday && (
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: zone.color }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
