"use client";

import { useEffect, useState } from "react";

export default function MyProjects() {
  const [projects, setProjects] = useState([]);
  const [applicationsByProject, setApplicationsByProject] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    loadMyProjects();
  }, []);

  async function loadMyProjects() {
    const userId = localStorage.getItem("devgym_user_id");
    if (!userId) {
      setError("Please log in to see your projects.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/projects");
      const allProjects = await res.json();
      const myProjects = allProjects.filter((p) => p.owner_id === userId);
      setProjects(myProjects);

      const appsMap = {};
      for (const project of myProjects) {
        const appsRes = await fetch(`http://127.0.0.1:8000/projects/${project.id}/applications`);
        appsMap[project.id] = await appsRes.json();
      }
      setApplicationsByProject(appsMap);
    } catch (err) {
      setError("Could not load your projects.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(applicationId) {
    setActionMessage("");
    try {
      const res = await fetch(`http://127.0.0.1:8000/applications/${applicationId}/accept`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Could not accept application");
      }
      setActionMessage("Application accepted!");
      loadMyProjects();
    } catch (err) {
      setActionMessage(err.message);
    }
  }

  async function handleReject(applicationId) {
    setActionMessage("");
    try {
      const res = await fetch(`http://127.0.0.1:8000/applications/${applicationId}/reject`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Could not reject application");
      }
      setActionMessage("Application rejected.");
      loadMyProjects();
    } catch (err) {
      setActionMessage(err.message);
    }
  }

  if (loading) return <p className="text-center text-zinc-500 py-20">Loading...</p>;
  if (error) return <p className="text-center text-red-500 py-20">{error}</p>;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-8">My projects</h1>

        {actionMessage && (
          <p className="text-sm mb-4 text-zinc-700 dark:text-zinc-300">{actionMessage}</p>
        )}

        {projects.length === 0 && (
          <p className="text-zinc-500 text-sm">You haven&apos;t published any projects yet.</p>
        )}

        <div className="flex flex-col gap-8">
          {projects.map((project) => {
            const applications = applicationsByProject[project.id] || [];
            return (
              <div key={project.id} className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                <h2 className="text-lg font-medium text-zinc-900 dark:text-white mb-1">{project.title}</h2>
                <p className="text-sm text-zinc-500 mb-4">{applications.length} application(s)</p>

                <div className="flex flex-col gap-2">
                  {applications.map((app) => (
                    <div key={app.id} className="flex items-center justify-between border border-zinc-100 dark:border-zinc-800 rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          {app.applicant_name || app.applicant_email}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Applied for {app.role_name} · {app.status}
                        </p>
                      </div>

                      {app.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAccept(app.id)}
                            className="text-xs px-3 py-1.5 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleReject(app.id)}
                            className="text-xs px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {applications.length === 0 && (
                    <p className="text-xs text-zinc-500">No applications yet.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}