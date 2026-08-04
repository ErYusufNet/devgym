import { PythonIcon, JavaScriptIcon, GitHubIcon, VSCodeIcon } from "@/components/icons/BrandIcons";

// Same floating-icon treatment as the landing page hero (FloatingTechLogos), but
// fixed to the viewport edges so it stays put while a tall content page scrolls,
// and dimmed so it stays ambient rather than competing with the page content.
const LOGOS = [
  { Icon: PythonIcon, position: "left-[3%] top-[18%]", duration: "6s", delay: "0s" },
  { Icon: JavaScriptIcon, position: "right-[3%] top-[28%]", duration: "7s", delay: "1.2s" },
  { Icon: GitHubIcon, position: "left-[4%] bottom-[20%]", duration: "5.5s", delay: "0.6s" },
  { Icon: VSCodeIcon, position: "right-[4%] bottom-[28%]", duration: "6.5s", delay: "1.8s" },
];

export default function FloatingTechLogosFixed() {
  return (
    <div className="hidden lg:block fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      {LOGOS.map(({ Icon, position, duration, delay }, i) => (
        <div
          key={i}
          className={
            "absolute w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm opacity-60 flex items-center justify-center animate-[float_6s_ease-in-out_infinite] " +
            position
          }
          style={{ animationDuration: duration, animationDelay: delay }}
        >
          <Icon className="w-5 h-5" />
        </div>
      ))}
    </div>
  );
}
