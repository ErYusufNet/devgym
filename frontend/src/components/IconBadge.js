const COLORS = {
  blue: "bg-blue-600/10 text-blue-600",
  purple: "bg-violet-600/10 text-violet-600",
  pink: "bg-pink-600/10 text-pink-600",
  teal: "bg-teal-600/10 text-teal-600",
  gold: "bg-gold/10 text-gold",
};

const SIZES = {
  sm: { box: "w-9 h-9 rounded-xl", icon: "w-4 h-4" },
  md: { box: "w-12 h-12 rounded-2xl", icon: "w-6 h-6" },
};

export default function IconBadge({ icon: Icon, color = "blue", size = "md", spin = false }) {
  const s = SIZES[size] || SIZES.md;
  // `spin` expects a `group` class on an ancestor (e.g. the card being hovered) —
  // rotates the icon and darkens its background together on group-hover.
  const spinClasses = spin
    ? "transition-[transform,filter] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-90 group-hover:brightness-90"
    : "";
  return (
    <div className={"shrink-0 flex items-center justify-center " + s.box + " " + (COLORS[color] || COLORS.blue) + " " + spinClasses}>
      <Icon className={s.icon} />
    </div>
  );
}
