"use client";

function getColor(count) {
  if (!count) return "bg-surface";
  if (count === 1) return "bg-accent/30";
  if (count === 2) return "bg-accent/60";
  return "bg-accent";
}

export default function ActivityHeatmap({ activity }) {
  const days = [];
  const today = new Date();

  for (let i = 119; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    days.push({ date: key, count: activity[key] || 0 });
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-navy mb-3">Activity</h2>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                title={day.date + " - " + day.count + " activity"}
                className={"w-3 h-3 rounded-sm " + getColor(day.count)}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="text-xs text-secondary mt-2">Last 120 days</p>
    </div>
  );
}