import FloatingTechLogos from "@/components/FloatingTechLogos";
import IconBadge from "@/components/IconBadge";
import ScrollReveal from "@/components/ScrollReveal";
import { IconCode, IconHeartHandshake, IconHeart } from "@/components/icons/TablerIcons";

const VALUES = [
  {
    title: "Built on real work",
    description: "No fake certificates. Every contribution is tracked through real GitHub activity.",
    icon: IconCode,
    color: "blue",
  },
  {
    title: "Community over competition",
    description: "Teams help each other grow. Reputation is earned through real collaboration, not selling.",
    icon: IconHeartHandshake,
    color: "purple",
  },
  {
    title: "Free, and staying that way",
    description: "Core features are free for everyone. We never want cost to be the reason someone can't practice.",
    icon: IconHeart,
    color: "pink",
  },
];

export default function About() {
  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-blue-50 px-6 pt-20 pb-24">
        <FloatingTechLogos />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-xs font-medium text-navy border border-blue-100 shadow-sm mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            Our story
          </span>

          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-navy mb-6">
            Why we built Ernord
          </h1>

          <p className="text-lg text-secondary max-w-xl mx-auto">
            Ernord started with a simple problem: talented developers lose momentum the moment
            they&apos;re between jobs. Tutorials only take you so far — real growth comes from
            working with other people, on real projects, under real constraints. We built Ernord
            to give unemployed and early-career developers exactly that: a place to keep building,
            keep learning, and keep proving what they can do — together.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <ScrollReveal>
          <h2 className="text-2xl font-semibold text-navy mb-4">Our mission</h2>
          <p className="text-secondary text-lg">
            We believe experience should be earned, not just claimed. Every project on Ernord is
            real: real teammates, real GitHub commits, real deadlines. When a project ships,
            it&apos;s not a simulation — it&apos;s proof.
          </p>
        </ScrollReveal>
      </section>

      <section className="bg-surface px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <h2 className="text-3xl font-semibold text-navy mb-3">What we stand for</h2>
          </ScrollReveal>

          <div className="grid sm:grid-cols-3 gap-6">
            {VALUES.map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 100}>
                <div className="group h-full border border-slate-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <IconBadge icon={item.icon} color={item.color} spin />
                  <h3 className="text-lg font-semibold text-navy mt-4 mb-2">{item.title}</h3>
                  <p className="text-sm text-secondary">{item.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-6 py-20">
        <ScrollReveal>
          <blockquote className="border-l-4 border-accent bg-card rounded-r-xl p-6 text-secondary italic">
            &quot;Ernord is built by a small team based in Finland, for developers everywhere who
            refuse to stop growing just because they&apos;re between jobs.&quot;
          </blockquote>
        </ScrollReveal>

        <ScrollReveal className="text-center mt-14">
          <p className="text-secondary mb-4">Have a question, or want to build something together?</p>
          <a
            href="/contact"
            className="inline-block px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:-translate-y-0.5"
          >
            Get in touch
          </a>
        </ScrollReveal>
      </section>
    </div>
  );
}
