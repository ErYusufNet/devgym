import { IconBrandGithub, IconBrandLinkedin, IconBrandX } from "@/components/icons/TablerIcons";

const COLUMNS = [
  {
    title: "For developers",
    links: [
      { label: "Discover projects", href: "/discover" },
      { label: "Create an account", href: "/register" },
      { label: "Log in", href: "/login" },
    ],
  },
  {
    title: "For projects",
    links: [
      { label: "Publish a project", href: "/create-project" },
      { label: "Manage your team", href: "/my-projects" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "About Ernord", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy", href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-4 gap-10 mb-12">
          <div className="sm:col-span-1">
            <p className="text-lg font-semibold mb-3">Ernord</p>
            <p className="text-sm text-slate-400">Build real experience on real teams.</p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-white mb-3">{col.title}</p>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-slate-400 hover:text-white">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-800">
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} Ernord. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" aria-label="GitHub" className="text-slate-400 hover:text-white">
              <IconBrandGithub className="w-5 h-5" />
            </a>
            <a href="#" aria-label="X (Twitter)" className="text-slate-400 hover:text-white">
              <IconBrandX className="w-5 h-5" />
            </a>
            <a href="#" aria-label="LinkedIn" className="text-slate-400 hover:text-white">
              <IconBrandLinkedin className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
