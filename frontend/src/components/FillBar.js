// A progress bar that animates from 0 to `value` (0-100) on mount, via the fillBar
// keyframe in globals.css (--target-width is read by the keyframe's `to` state).
export default function FillBar({ value, className = "", barClassName = "" }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={"h-2 rounded-full bg-surface overflow-hidden " + className}>
      <div
        style={{ "--target-width": `${pct}%` }}
        className={"h-full rounded-full bg-accent animate-[fillBar_1s_ease-out_forwards] " + barClassName}
      />
    </div>
  );
}
