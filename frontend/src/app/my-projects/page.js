"use client";

import { useEffect, useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import IconBadge from "@/components/IconBadge";
import { IconPencil, IconTrash } from "@/components/icons/TablerIcons";
import { getProjectTypeMeta } from "@/lib/projectTypeMeta";
import { authFetch } from "@/lib/authFetch";

export default function MyProjects() {
  const [projects, setProjects] = useState([]);
  const [applicationsByProject, setApplicationsByProject] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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
      const res = await authFetch(`http://127.0.0.1:8000/applications/${applicationId}/accept`, {
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
      const res = await authFetch(`http://127.0.0.1:8000/applications/${applicationId}/reject`, {
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

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const res = await authFetch(`http://127.0.0.1:8000/projects/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Could not delete project");
      }
      setProjects(projects.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setActionMessage(err.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <p className="text-center text-secondary py-20">Loading...</p>;
  if (error) return <p className="text-center text-red-500 py-20">{error}</p>;

  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <ScrollReveal className="flex items-center gap-3 mb-8">
          <h1 className="text-3xl font-semibold text-navy">My projects</h1>
          <span className="px-2.5 py-1 rounded-full bg-surface text-secondary text-xs font-medium">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </span>
        </ScrollReveal>

        {actionMessage && (
          <p className="text-sm mb-4 text-navy">{actionMessage}</p>
        )}

        {projects.length === 0 && (
          <p className="text-secondary text-sm">You haven&apos;t published any projects yet.</p>
        )}

        <div className="flex flex-col gap-6">
          {projects.map((project, i) => {
            const applications = applicationsByProject[project.id] || [];
            const meta = getProjectTypeMeta(project.project_type);
            return (
              <ScrollReveal key={project.id} delay={(i % 4) * 80}>
                <div className="relative border border-slate-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <div className="absolute top-4 right-4 flex gap-1">
                    <a
                      href={`/projects/${project.id}/edit`}
                      aria-label="Edit project"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-navy hover:bg-surface"
                    >
                      <IconPencil className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => setDeleteTarget(project)}
                      aria-label="Delete project"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-red-600 hover:bg-red-50"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </div>

                  <IconBadge icon={meta.icon} color={meta.color} />

                  <h2 className="text-lg font-semibold text-navy mt-4 mb-1 pr-20">{project.title}</h2>
                  <span className="inline-block px-2.5 py-1 rounded-full bg-blue-600/10 text-blue-600 text-xs font-medium mb-4">
                    {applications.length} application{applications.length === 1 ? "" : "s"}
                  </span>

                  <div className="flex flex-col gap-2">
                    {applications.map((app) => (
                      <div key={app.id} className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center text-xs font-semibold shrink-0">
                            {(app.applicant_name || app.applicant_email || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <a
                              href={`/profile/${app.user_id}`}
                              className="text-sm font-medium text-navy hover:text-accent hover:underline"
                            >
                              {app.applicant_name || app.applicant_email}
                            </a>
                            <p className="text-xs text-secondary">
                              Applied for {app.role_name} · {app.status}
                            </p>
                          </div>
                        </div>

                        {app.status === "pending" && (
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleAccept(app.id)}
                              className="text-xs px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 font-medium transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleReject(app.id)}
                              className="text-xs px-3 py-1.5 rounded-md border border-red-300 text-red-600 hover:bg-red-50 font-medium transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {applications.length === 0 && (
                      <p className="text-xs text-secondary">No applications yet.</p>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 bg-navy/40 flex items-center justify-center z-50 px-6"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-navy mb-2">Delete &quot;{deleteTarget.title}&quot;?</h3>
            <p className="text-sm text-secondary mb-6">
              Are you sure you want to delete this project? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm text-secondary hover:text-navy disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
