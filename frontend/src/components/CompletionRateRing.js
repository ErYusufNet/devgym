// Small circular progress indicator for a user's project completion rate
// (completed joined-projects / total joined-projects). Renders nothing until
// the user has joined at least one project, since a rate is undefined otherwise.
export default function CompletionRateRing({ completed, total, rate }) {
  if (!total) return null;

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90 shrink-0">
        <circle cx="22" cy="22" r={radius} fill="none" strokeWidth="4" className="stroke-surface" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className="stroke-accent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div>
        <p className="text-sm font-medium text-navy">{rate}% completion rate</p>
        <p className="text-xs text-secondary">{completed}/{total} joined projects completed</p>
      </div>
    </div>
  );
}
