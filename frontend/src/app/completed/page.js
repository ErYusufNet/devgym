"use client";

import { useEffect, useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import IconBadge from "@/components/IconBadge";
import FloatingTechLogosFixed from "@/components/FloatingTechLogosFixed";
import { getProjectTypeMeta } from "@/lib/projectTypeMeta";
import { API_URL } from "@/lib/api";

export default function Completed() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCompleted() {
      try {
        const res = await fetch(`${API_URL}/projects?has_open_position=false`);
        if (!res.ok) throw new Error("Could not load projects");
        const data = await res.json();
        setProjects(data.filter((p) => p.status === "completed"));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCompleted();
  }, []);

  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <FloatingTechLogosFixed />
      <div className="max-w-2xl mx-auto">
        <ScrollReveal className="mb-10">
          <h1 className="text-3xl font-semibold text-navy mb-2">Completed projects</h1>
          <p className="text-secondary">A showcase of projects shipped by Ernord teams.</p>
        </ScrollReveal>

        {loading && <p className="text-secondary">Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <div className="flex flex-col gap-5">
          {projects.map((project, i) => {
            const meta = getProjectTypeMeta(project.project_type);
            return (
              <ScrollReveal key={project.id} delay={(i % 4) * 80} className="[perspective:600px]">
                <div className="border border-card-border rounded-xl p-6 bg-card shadow-sm hover:shadow-md transition-[transform,box-shadow] duration-300 ease-out hover:[transform:rotateX(4deg)_rotateY(-4deg)_scale(1.01)]">
                  <div className="flex items-start justify-between mb-4">
                    <IconBadge icon={meta.icon} color={meta.color} />
                    <span className="text-xs px-2 py-1 rounded-full bg-green-600/10 text-green-600 font-medium">
                      🎉 Completed
                    </span>
                  </div>

                  <h2 className="text-lg font-semibold text-navy mb-2">{project.title}</h2>
                  <p className="text-sm text-secondary mb-4">{project.description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tech_stack.map((tech) => (
                      <span key={tech} className="text-xs px-2 py-1 rounded-md bg-surface text-navy">{tech}</span>
                    ))}
                  </div>

                  {project.completion_summary && (
                    <div className="border border-slate-200 rounded-lg p-4 bg-surface mb-4">
                      <p className="text-xs font-semibold text-navy mb-1">📝 Project summary</p>
                      <p className="text-sm text-secondary whitespace-pre-wrap">{project.completion_summary}</p>
                    </div>
                  )}

                  <a href={`/projects/${project.id}`} className="text-sm font-medium text-accent hover:text-accent-hover">View project →</a>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {!loading && projects.length === 0 && (
          <p className="text-secondary">No completed projects yet.</p>
        )}
      </div>
    </div>
  );
}
