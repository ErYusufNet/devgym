// Wraps a list row that should slide in from the left as the list mounts, with a
// staggered per-item delay (capped after `maxDelayIndex` items so a long list doesn't
// leave the last rows animating for ages — see the slideInLeft keyframe in globals.css).
export default function SlideIn({ children, index = 0, maxDelayIndex = 9, className = "", ...rest }) {
  const delay = Math.min(index, maxDelayIndex) * 0.08;
  return (
    <div
      style={{ animationDelay: `${delay}s` }}
      className={"opacity-0 animate-[slideInLeft_0.4s_ease-out_both] " + className}
      {...rest}
    >
      {children}
    </div>
  );
}
