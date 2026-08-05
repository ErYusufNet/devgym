import { PythonIcon, ReactIcon, GitHubIcon, JavaScriptIcon, VSCodeIcon } from "@/components/icons/BrandIcons";

const TECHS = [
  { Icon: PythonIcon, label: "Python" },
  { Icon: ReactIcon, label: "React" },
  { Icon: GitHubIcon, label: "GitHub" },
  { Icon: JavaScriptIcon, label: "JavaScript" },
  { Icon: VSCodeIcon, label: "VS Code" },
];

// Duplicated once so the track's midpoint lines up exactly with translateX(-50%),
// making the loop seamless — see the marqueeScroll keyframe in globals.css.
const ITEMS = [...TECHS, ...TECHS];

export default function TechMarquee() {
  return (
    <div className="overflow-hidden border-y border-slate-200 bg-white py-8" aria-hidden="true">
      <div className="flex w-max gap-16 animate-[marqueeScroll_15s_linear_infinite] hover:[animation-play-state:paused]">
        {ITEMS.map(({ Icon, label }, i) => (
          <div key={i} className="flex shrink-0 items-center gap-2 text-secondary">
            <Icon className="w-6 h-6" />
            <span className="text-sm font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
