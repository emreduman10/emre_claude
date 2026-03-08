import { PlanEntry } from '../hooks/usePlans';
import { WeekSelector } from './WeekSelector';
import { DayNav } from './DayNav';

interface SidebarProps {
  weeks: PlanEntry[];
  activeWeek: string;
  activeDay: string;
  onSelectWeek: (weekDate: string) => void;
  onSelectDay: (day: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  weeks,
  activeWeek,
  activeDay,
  onSelectWeek,
  onSelectDay,
  isOpen,
  onClose,
}: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gray-900 border-r border-gray-800 p-4 overflow-y-auto transition-transform lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <WeekSelector
          weeks={weeks}
          activeWeek={activeWeek}
          onSelectWeek={(week) => {
            onSelectWeek(week);
            onClose();
          }}
        />
        <hr className="border-gray-800 my-4" />
        <DayNav
          activeDay={activeDay}
          onSelectDay={(day) => {
            onSelectDay(day);
            onClose();
          }}
        />
      </aside>
    </>
  );
}
