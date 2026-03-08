import { useGeneratePlan } from '../hooks/useGeneratePlan';
import { useAuth } from '../context/AuthContext';

interface GeneratePlanButtonProps {
  onPlanGenerated: (weekDate: string) => void;
}

export function GeneratePlanButton({
  onPlanGenerated,
}: GeneratePlanButtonProps) {
  const { isAuthenticated } = useAuth();
  const { generate, generating, error } = useGeneratePlan();

  async function handleClick() {
    const result = await generate();
    if (result?.weekDate) {
      onPlanGenerated(result.weekDate);
    }
  }

  return (
    <div className="mb-4">
      <button
        onClick={handleClick}
        disabled={generating || !isAuthenticated}
        className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          generating
            ? 'bg-gray-700 text-gray-400 cursor-wait'
            : !isAuthenticated
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-500 text-white cursor-pointer'
        }`}
        title={
          !isAuthenticated
            ? 'Sign in with WHOOP first'
            : 'Generate this week\'s plan from WHOOP data'
        }
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Generating...
          </span>
        ) : (
          'Generate This Week\'s Plan'
        )}
      </button>
      {error && (
        <p className="text-red-400 text-xs mt-1.5 px-1">{error}</p>
      )}
      {!isAuthenticated && (
        <p className="text-gray-500 text-xs mt-1.5 px-1">
          Sign in with WHOOP to generate plans
        </p>
      )}
    </div>
  );
}
