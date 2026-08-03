const COLORS = {
  blue: "bg-blue-600/10 text-blue-600",
  purple: "bg-violet-600/10 text-violet-600",
  pink: "bg-pink-600/10 text-pink-600",
  teal: "bg-teal-600/10 text-teal-600",
};

export default function IconBadge({ icon: Icon, color = "blue" }) {
  return (
    <div className={"w-12 h-12 rounded-2xl flex items-center justify-center " + (COLORS[color] || COLORS.blue)}>
      <Icon className="w-6 h-6" />
    </div>
  );
}
