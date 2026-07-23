"use client";

import { useEffect, useState } from "react";

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
    <div className="min-h-screen bg-white dark:bg-zinc-950 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-8">Discover projects</h1>

        {loading && <p className="text-zinc-500">Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <div className="flex flex-col gap-4">
          {projects.map((project) => (
            <div key={project.id} className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-medium text-zinc-900 dark:text-white">{project.title}</h2>
                {project.project_type && (
                  <span className="text-xs px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 capitalize">
                    {project.project_type}
                  </span>
                )}
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">{project.description}</p>

              <div className="flex flex-wrap gap-2 mb-3">
                {project.tech_stack.map((tech) => (
                  <span key={tech} className="text-xs px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">{tech}</span>
                ))}
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-500 mb-4">
                {project.duration_weeks && <span>{project.duration_weeks} weeks</span>}
                {project.weekly_hours && <span>{project.weekly_hours} hrs / week</span>}
                {project.timezone && <span>{project.timezone}</span>}
              </div>

              <a href={`/projects/${project.id}`} className="text-sm font-medium text-zinc-900 dark:text-white underline">View project</a>
            </div>
          ))}
        </div>

        {!loading && projects.length === 0 && (
          <p className="text-zinc-500">No projects published yet.</p>
        )}
      </div>
    </div>
  );
}