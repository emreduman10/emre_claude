import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DayPlan } from '../types';

interface DayViewProps {
  day: DayPlan;
}

export function DayView({ day }: DayViewProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-100">{day.dayName}</h2>
      <div className="markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {day.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
