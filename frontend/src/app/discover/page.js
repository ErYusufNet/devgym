"use client";

import { useCallback, useEffect, useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import IconBadge from "@/components/IconBadge";
import { getProjectTypeMeta } from "@/lib/projectTypeMeta";
import { POSITION_ROLES } from "@/lib/roles";

const PROJECT_TYPES = ["web", "mobile", "saas", "desktop", "api", "game", "testing"];

export default function Discover() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [role, setRole] = useState("");
  const [tech, setTech] = useState("");
  const [projectType, setProjectType] = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const [maxHours, setMaxHours] = useState("");
  const [openOnly, setOpenOnly] = useState(true);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (role) params.set("role", role);
      if (tech) params.set("tech", tech);
      if (projectType) params.set("project_type", projectType);
      if (maxDuration) params.set("duration_weeks", maxDuration);
      if (maxHours) params.set("weekly_hours", maxHours);
      params.set("has_open_position", openOnly ? "true" : "false");

      const res = await fetch(`http://127.0.0.1:8000/projects?${params}`);
      if (!res.ok) throw new Error("Could not load projects");
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [role, tech, projectType, maxDuration, maxHours, openOnly]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchProjects();
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchProjects]);

  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <ScrollReveal className="mb-10">
          <h1 className="text-3xl font-semibold text-navy mb-2">Discover projects</h1>
          <p className="text-secondary">Browse open projects and find your next team.</p>
        </ScrollReveal>

        <ScrollReveal className="mb-8">
          <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-secondary">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-navy text-sm focus:outline-none focus:border-accent"
              >
                <option value="">Any role</option>
                {POSITION_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-secondary">Technology</label>
              <input
                type="text"
                placeholder="e.g. React"
                value={tech}
                onChange={(e) => setTech(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-navy text-sm placeholder:text-secondary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-secondary">Project type</label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-navy text-sm capitalize focus:outline-none focus:border-accent"
              >
                <option value="">Any type</option>
                {PROJECT_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-secondary">Max duration (weeks)</label>
              <input
                type="number"
                min="1"
                placeholder="Any"
                value={maxDuration}
                onChange={(e) => setMaxDuration(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-navy text-sm placeholder:text-secondary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-secondary">Max hours / week</label>
              <input
                type="number"
                min="1"
                placeholder="Any"
                value={maxHours}
                onChange={(e) => setMaxHours(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-navy text-sm placeholder:text-secondary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-navy">
                <input
                  type="checkbox"
                  checked={openOnly}
                  onChange={(e) => setOpenOnly(e.target.checked)}
                  className="accent-accent"
                />
                Open positions only
              </label>
            </div>
          </div>
        </ScrollReveal>

        {loading && <p className="text-secondary">Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <div className="flex flex-col gap-5">
          {projects.map((project, i) => {
            const meta = getProjectTypeMeta(project.project_type);
            return (
              <ScrollReveal key={project.id} delay={(i % 4) * 80}>
                <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <IconBadge icon={meta.icon} color={meta.color} />
                    {project.project_type && (
                      <span className="text-xs px-2 py-1 rounded-md bg-surface text-secondary capitalize">
                        {project.project_type}
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg font-semibold text-navy mb-2">{project.title}</h2>
                  <p className="text-sm text-secondary mb-4">{project.description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tech_stack.map((tech) => (
                      <span key={tech} className="text-xs px-2 py-1 rounded-md bg-surface text-navy">{tech}</span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-secondary mb-4">
                    {project.duration_weeks && <span>{project.duration_weeks} weeks</span>}
                    {project.weekly_hours && <span>{project.weekly_hours} hrs / week</span>}
                    {project.timezone && <span>{project.timezone}</span>}
                  </div>

                  <a href={`/projects/${project.id}`} className="text-sm font-medium text-accent hover:text-accent-hover">View project →</a>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {!loading && projects.length === 0 && (
          <p className="text-secondary">No projects match your filters.</p>
        )}
      </div>
    </div>
  );
}
