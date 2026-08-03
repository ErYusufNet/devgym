"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ScrollReveal from "@/components/ScrollReveal";
import IconBadge from "@/components/IconBadge";
import { IconUsers } from "@/components/icons/TablerIcons";
import { getProjectTypeMeta } from "@/lib/projectTypeMeta";

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applyingTo, setApplyingTo] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      const [projectRes, positionsRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/projects/${id}`),
        fetch(`http://127.0.0.1:8000/projects/${id}/positions`),
      ]);

      if (!projectRes.ok) throw new Error("Project not found");

      const projectData = await projectRes.json();
      const positionsData = await positionsRes.json();

      setProject(projectData);
      setPositions(positionsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApply(positionId) {
    setMessage("");
    const userId = localStorage.getItem("devgym_user_id");

    if (!userId) {
      setMessage("Please log in to apply.");
      return;
    }

    setApplyingTo(positionId);

    try {
      const res = await fetch("http://127.0.0.1:8000/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position_id: positionId,
          user_id: userId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Could not apply");
      }

      setMessage("Application sent!");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setApplyingTo(null);
    }
  }

  if (loading) {
    return <p className="text-center text-secondary py-20">Loading...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-20">{error}</p>;
  }

  const meta = getProjectTypeMeta(project.project_type);

  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <ScrollReveal>
          <div className="flex items-start justify-between mb-4">
            <IconBadge icon={meta.icon} color={meta.color} />
            {project.project_type && (
              <span className="text-xs px-2 py-1 rounded-md bg-surface text-secondary capitalize">
                {project.project_type}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-semibold text-navy mb-2">{project.title}</h1>
          <p className="text-secondary mb-4">{project.description}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {project.tech_stack.map((tech) => (
              <span key={tech} className="text-xs px-2 py-1 rounded-md bg-surface text-navy">{tech}</span>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-secondary mb-6">
            {project.duration_weeks && <span>{project.duration_weeks} weeks</span>}
            {project.weekly_hours && <span>{project.weekly_hours} hrs / week</span>}
            {project.timezone && <span>{project.timezone}</span>}
          </div>

          {project.github_repo_url && (
            <a href={project.github_repo_url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:text-accent-hover mb-8 inline-block">
              View GitHub repository
            </a>
          )}
        </ScrollReveal>

        <ScrollReveal className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <IconBadge icon={IconUsers} color="purple" size="sm" />
            <h2 className="text-xl font-semibold text-navy">Open positions</h2>
          </div>

          {message && (
            <p className="text-sm mb-4 text-navy">{message}</p>
          )}

          <div className="flex flex-col gap-3">
            {positions.map((position, i) => (
              <ScrollReveal key={position.id} delay={(i % 4) * 80}>
                <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-navy">{position.role_name}</p>
                    {position.description && (
                      <p className="text-sm text-secondary">{position.description}</p>
                    )}
                  </div>

                  {position.status === "open" ? (
                    <button
                      onClick={() => handleApply(position.id)}
                      disabled={applyingTo === position.id}
                      className="text-xs px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-50 shrink-0"
                    >
                      {applyingTo === position.id ? "Applying..." : "Apply"}
                    </button>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-md bg-surface text-secondary shrink-0">
                      filled
                    </span>
                  )}
                </div>
              </ScrollReveal>
            ))}

            {positions.length === 0 && (
              <p className="text-secondary text-sm">No positions listed.</p>
            )}
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
