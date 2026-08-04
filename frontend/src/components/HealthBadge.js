const HEALTH_META = {
  active: { label: "Active", dot: "bg-green-500", text: "text-green-700" },
  slow: { label: "Slow", dot: "bg-yellow-500", text: "text-yellow-700" },
  stale: { label: "Inactive", dot: "bg-slate-400", text: "text-secondary" },
};

export default function HealthBadge({ health }) {
  const meta = HEALTH_META[health];
  if (!meta) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-surface ${meta.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
