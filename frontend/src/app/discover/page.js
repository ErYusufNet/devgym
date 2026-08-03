"use client";

import { useEffect, useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import IconBadge from "@/components/IconBadge";
import { getProjectTypeMeta } from "@/lib/projectTypeMeta";

export default function Discover() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("http://127.0.0.1:8000/projects");
        if (!res.ok) throw new Error("Could not load projects");
        const data = await res.json();
        setProjects(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <ScrollReveal className="mb-10">
          <h1 className="text-3xl font-semibold text-navy mb-2">Discover projects</h1>
          <p className="text-secondary">Browse open projects and find your next team.</p>
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
          <p className="text-secondary">No projects published yet.</p>
        )}
      </div>
    </div>
  );
}
