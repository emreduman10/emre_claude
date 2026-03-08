import type { PlanEntry } from '../hooks/usePlans';
import { formatWeekLabel } from '../utils/markdownParser';

interface WeekSelectorProps {
  weeks: PlanEntry[];
  activeWeek: string;
  onSelectWeek: (weekDate: string) => void;
}

export function WeekSelector({
  weeks,
  activeWeek,
  onSelectWeek,
}: WeekSelectorProps) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-2">
        Weekly Plans
      </h2>
      <div className="space-y-1">
        {weeks.map((week) => (
          <button
            key={week.weekDate}
            onClick={() => onSelectWeek(week.weekDate)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              activeWeek === week.weekDate
                ? 'bg-blue-600/20 text-blue-400 font-medium'
                : 'text-gray-300 hover:bg-gray-800 hover:text-gray-100'
            }`}
          >
            Week of {formatWeekLabel(week.weekDate)}
          </button>
        ))}
      </div>
    </div>
  );
}
