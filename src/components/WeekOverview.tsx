import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { WeekPlan } from '../types';
import { formatWeekLabel } from '../utils/markdownParser';
import { FIXED_CONSTRAINTS, RECOVERY_ZONES } from '../config/training';

interface WeekOverviewProps {
  plan: WeekPlan;
}

export function WeekOverview({ plan }: WeekOverviewProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-100">
        Week of {formatWeekLabel(plan.weekDate)}
      </h2>

      <div className="markdown-body mb-8">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {plan.overview}
        </ReactMarkdown>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
            Recovery Zones
          </h3>
          <div className="space-y-2">
            {RECOVERY_ZONES.map((z) => (
              <div key={z.zone} className="flex items-center gap-2 text-sm">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: z.color }}
                />
                <span className="text-gray-300">{z.guidance}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
            Weekly Constraints
          </h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>
              <span className="font-medium text-gray-200">Tuesday:</span>{' '}
              {FIXED_CONSTRAINTS.tuesdayActivity} (always)
            </li>
            <li>
              <span className="font-medium text-gray-200">Note:</span>{' '}
              {FIXED_CONSTRAINTS.lowerBackNote}
            </li>
          </ul>
        </div>
      </div>

      {plan.notes && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
            Weekly Notes
          </h3>
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {plan.notes}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
