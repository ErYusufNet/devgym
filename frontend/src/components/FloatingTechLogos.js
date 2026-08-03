import { PythonIcon, JavaScriptIcon, GitHubIcon, VSCodeIcon } from "@/components/icons/BrandIcons";

const LOGOS = [
  { Icon: PythonIcon, position: "left-[6%] top-[14%]", duration: "6s", delay: "0s" },
  { Icon: JavaScriptIcon, position: "right-[8%] top-[22%]", duration: "7s", delay: "1.2s" },
  { Icon: GitHubIcon, position: "left-[11%] bottom-[16%]", duration: "5.5s", delay: "0.6s" },
  { Icon: VSCodeIcon, position: "right-[6%] bottom-[24%]", duration: "6.5s", delay: "1.8s" },
];

export default function FloatingTechLogos() {
  return (
    <div className="hidden sm:block absolute inset-0 pointer-events-none" aria-hidden="true">
      {LOGOS.map(({ Icon, position, duration, delay }, i) => (
        <div
          key={i}
          className={
            "absolute w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center animate-[float_6s_ease-in-out_infinite] " +
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
