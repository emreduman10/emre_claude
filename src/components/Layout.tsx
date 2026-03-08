import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { PlanEntry } from '../hooks/usePlans';

interface LayoutProps {
  weeks: PlanEntry[];
  activeWeek: string;
  activeDay: string;
  onSelectWeek: (weekDate: string) => void;
  onSelectDay: (day: string) => void;
  children: React.ReactNode;
}

export function Layout({
  weeks,
  activeWeek,
  activeDay,
  onSelectWeek,
  onSelectDay,
  children,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar
          weeks={weeks}
          activeWeek={activeWeek}
          activeDay={activeDay}
          onSelectWeek={onSelectWeek}
          onSelectDay={onSelectDay}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 min-w-0">
          {/* Mobile menu button */}
          <div className="lg:hidden p-4 pb-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              Menu
            </button>
          </div>
          <div className="p-6 max-w-4xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
