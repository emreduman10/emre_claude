import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { DayView } from '../components/DayView';
import { WeekOverview } from '../components/WeekOverview';
import { usePlans } from '../hooks/usePlans';
import { DAY_NAMES } from '../types';

export function PlanPage() {
  const { weekDate, day } = useParams<{ weekDate: string; day?: string }>();
  const navigate = useNavigate();
  const { availableWeeks, currentPlan, loadPlan, loading } = usePlans();

  // Load plan when weekDate changes
  useEffect(() => {
    if (weekDate) {
      loadPlan(weekDate);
    }
  }, [weekDate, loadPlan]);

  // Redirect to first available week if none selected
  useEffect(() => {
    if (!weekDate && availableWeeks.length > 0) {
      const todayDayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
      navigate(`/${availableWeeks[0].weekDate}/${todayDayName}`, {
        replace: true,
      });
    }
  }, [weekDate, availableWeeks, navigate]);

  const handleSelectWeek = (week: string) => {
    navigate(`/${week}/${day || 'monday'}`);
  };

  const handleSelectDay = (selectedDay: string) => {
    navigate(`/${weekDate}/${selectedDay}`);
  };

  // Find the day plan
  const selectedDay = currentPlan?.days.find(
    (d) => d.dayName.toLowerCase() === day?.toLowerCase(),
  );

  return (
    <Layout
      weeks={availableWeeks}
      activeWeek={weekDate || ''}
      activeDay={day || ''}
      onSelectWeek={handleSelectWeek}
      onSelectDay={handleSelectDay}
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 animate-pulse">Loading plan...</div>
        </div>
      ) : !currentPlan ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">
            {availableWeeks.length === 0
              ? 'No workout plans found. Add .md files to the /plans directory.'
              : 'Select a week to get started.'}
          </div>
        </div>
      ) : !day || !selectedDay ? (
        <WeekOverview plan={currentPlan} />
      ) : (
        <DayView day={selectedDay} />
      )}
    </Layout>
  );
}
