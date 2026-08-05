import FloatingTechLogos from "@/components/FloatingTechLogos";
import IconBadge from "@/components/IconBadge";
import ScrollReveal from "@/components/ScrollReveal";
import StatsStrip from "@/components/StatsStrip";
import TechMarquee from "@/components/TechMarquee";
import {
  IconRocket,
  IconUsers,
  IconCode,
  IconBrandGithub,
  IconBriefcase,
  IconSchool,
  IconBulb,
  IconArrowRight,
  IconTarget,
  IconFolder,
  IconShieldCheck,
  IconHeartHandshake,
  IconUserPlus,
} from "@/components/icons/TablerIcons";

const AUDIENCES = [
  {
    title: "Between jobs",
    description: "Looking for work? Keep building, keep learning, and show what you can actually do — not just what's on your CV.",
    icon: IconBriefcase,
    color: "blue",
    href: "/discover",
  },
  {
    title: "New graduate",
    description: "No professional experience yet? Join a real project, work with a real team, and start your portfolio the right way.",
    icon: IconSchool,
    color: "purple",
    href: "/discover",
  },
  {
    title: "Have a project idea",
    description: "Publish your project, recruit a team, and build it together with people who want the same experience.",
    icon: IconBulb,
    color: "pink",
    href: "/create-project",
  },
];

const STEPS = [
  {
    title: "Publish or join a project",
    description: "Post your own idea, or find one that needs a hand.",
    icon: IconRocket,
    color: "blue",
  },
  {
    title: "Get matched with a role",
    description: "Apply for an open position that fits your skills.",
    icon: IconUsers,
    color: "purple",
  },
  {
    title: "Work with a real team",
    description: "Collaborate, write code, and ship features together.",
    icon: IconCode,
    color: "pink",
  },
  {
    title: "Ship it together on GitHub",
    description: "Every contribution lands in a real repo — and your portfolio.",
    icon: IconBrandGithub,
    color: "teal",
  },
];

const CAPABILITIES = [
  {
    title: "Publish your own project",
    description: "Share an idea, define the roles you need, and recruit a real team.",
    icon: IconRocket,
    color: "blue",
    href: "/create-project",
  },
  {
    title: "Join projects that fit you",
    description: "Filter by role, technology, and time commitment. Apply in one click.",
    icon: IconUsers,
    color: "purple",
    href: "/discover",
  },
  {
    title: "Prove your work",
    description: "Every project connects to GitHub — your commits, your contributions, visible and verified.",
    icon: IconBrandGithub,
    color: "teal",
    href: "/completed",
  },
  {
    title: "Get discovered",
    description: "Recruiters can find you through Find Talent, based on your real activity — not just a CV.",
    icon: IconUserPlus,
    color: "pink",
    href: "/talent",
  },
];

const REASONS = [
  {
    title: "Real experience",
    description: "Not a course, not a simulation. Real projects, real teammates, real outcomes.",
    icon: IconTarget,
    color: "blue",
  },
  {
    title: "One profile, every project",
    description: "Your work in one place — every project you join adds to your portfolio automatically.",
    icon: IconFolder,
    color: "purple",
  },
  {
    title: "Verified contributions",
    description: "What you did is visible and traceable through your real GitHub activity.",
    icon: IconShieldCheck,
    color: "pink",
  },
  {
    title: "A supportive community",
    description: "You're not doing this alone. Build alongside people in the same situation as you.",
    icon: IconHeartHandshake,
    color: "teal",
  },
];

export default function Home() {
  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-blue-50 px-6 pt-20 pb-28">
        <FloatingTechLogos />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-xs font-medium text-navy border border-blue-100 shadow-sm mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            Nordic career platform
          </span>

          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-navy mb-6">
            Build real experience on real teams
          </h1>

          <p className="text-lg text-secondary mb-10 max-w-xl mx-auto">
            Ernord helps unemployed and early-career developers keep their skills sharp by working on real software projects with real teams — not alone, not just tutorials.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <a
              href="/register"
              className="px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:-translate-y-0.5"
            >
              Get started free
            </a>
            <a href="#how-it-works" className="px-6 py-3 bg-white border border-slate-200 rounded-lg font-medium text-navy hover:bg-surface">
              See how it works
            </a>
          </div>

          <StatsStrip />
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-24">
        <ScrollReveal className="text-center mb-14">
          <h2 className="text-3xl font-semibold text-navy mb-3">Who is Ernord for?</h2>
          <p className="text-secondary max-w-xl mx-auto">No matter where you&apos;re starting from, there&apos;s a place for you here.</p>
        </ScrollReveal>

        <div className="grid sm:grid-cols-3 gap-6">
          {AUDIENCES.map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 100}>
              <div className="group h-full border border-slate-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                <IconBadge icon={item.icon} color={item.color} spin />
                <h3 className="text-lg font-semibold text-navy mt-4 mb-2">{item.title}</h3>
                <p className="text-sm text-secondary mb-4">{item.description}</p>
                <a href={item.href} className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover">
                  Learn more
                  <IconArrowRight className="w-4 h-4" />
                </a>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="bg-surface px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-center mb-16">
            <h2 className="text-3xl font-semibold text-navy mb-3">How it works</h2>
            <p className="text-secondary max-w-xl mx-auto">From an idea to a shipped project — in four steps.</p>
          </ScrollReveal>

          <div className="relative">
            <div className="hidden md:block absolute top-6 left-[12.5%] right-[12.5%] h-px bg-slate-200" />

            <div className="grid md:grid-cols-4 gap-10">
              {STEPS.map((step, i) => (
                <ScrollReveal key={step.title} delay={i * 100}>
                  <div className="group relative flex flex-col items-center text-center">
                    <div className="relative bg-surface">
                      <IconBadge icon={step.icon} color={step.color} spin />
                    </div>
                    <h3 className="text-base font-semibold text-navy mt-4 mb-1">{step.title}</h3>
                    <p className="text-sm text-secondary">{step.description}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <h2 className="text-3xl font-semibold text-navy mb-3">What can you do here?</h2>
            <p className="text-secondary max-w-xl mx-auto">Everything you need to turn idle time into a real track record.</p>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CAPABILITIES.map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 100}>
                <a
                  href={item.href}
                  className="group h-full block border border-slate-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <IconBadge icon={item.icon} color={item.color} spin />
                  <h3 className="text-base font-semibold text-navy mt-4 mb-2">{item.title}</h3>
                  <p className="text-sm text-secondary">{item.description}</p>
                </a>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-24">
        <ScrollReveal className="text-center mb-14">
          <h2 className="text-3xl font-semibold text-navy mb-3">Why Ernord</h2>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {REASONS.map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 100}>
              <div className="group h-full border border-slate-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                <IconBadge icon={item.icon} color={item.color} spin />
                <h3 className="text-base font-semibold text-navy mt-4 mb-2">{item.title}</h3>
                <p className="text-sm text-secondary">{item.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <TechMarquee />
    </div>
  );
}
