"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import { POSITION_ROLES } from "@/lib/roles";
import FloatingTechLogosFixed from "@/components/FloatingTechLogosFixed";
import { API_URL } from "@/lib/api";

const PROJECT_TYPES = ["web", "mobile", "saas", "desktop", "api", "game", "testing"];
// Purely a UI convenience to let the edit form load for the admin account too —
// the actual gate is the owner-or-admin check on PUT /projects/{id} server-side.
const ADMIN_EMAIL = "ernordbusiness@hotmail.com";

export default function EditProject() {
  const { id } = useParams();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [projectType, setProjectType] = useState("web");
  const [durationWeeks, setDurationWeeks] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("");
  const [timezone, setTimezone] = useState("");

  const [positions, setPositions] = useState([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [addingPosition, setAddingPosition] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingAsAdmin, setEditingAsAdmin] = useState(false);

  useEffect(() => {
    async function loadProject() {
      const userId = localStorage.getItem("devgym_user_id");

      try {
        const res = await fetch(`${API_URL}/projects/${id}`);
        if (!res.ok) throw new Error("Project not found");
        const project = await res.json();

        let isAdmin = false;
        if (userId && project.owner_id !== userId) {
          const profileRes = await fetch(`${API_URL}/users/${userId}/profile`);
          const profile = profileRes.ok ? await profileRes.json() : null;
          isAdmin = profile?.email === ADMIN_EMAIL;
        }

        if (!userId || (project.owner_id !== userId && !isAdmin)) {
          setError("You don't have permission to edit this project.");
          setLoading(false);
          return;
        }

        setEditingAsAdmin(isAdmin);

        setTitle(project.title || "");
        setDescription(project.description || "");
        setTechStack((project.tech_stack || []).join(", "));
        setGithubUrl(project.github_repo_url || "");
        setProjectType(project.project_type || "web");
        setDurationWeeks(project.duration_weeks || "");
        setWeeklyHours(project.weekly_hours || "");
        setTimezone(project.timezone || "");

        const positionsRes = await fetch(`${API_URL}/projects/${id}/positions`);
        setPositions(await positionsRes.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!localStorage.getItem("devgym_token")) {
      setError("Please log in to edit this project.");
      return;
    }

    setSaving(true);

    try {
      const res = await authFetch(`${API_URL}/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          tech_stack: techStack.split(",").map((t) => t.trim()).filter(Boolean),
          github_repo_url: githubUrl,
          project_type: projectType,
          duration_weeks: durationWeeks ? parseInt(durationWeeks) : null,
          weekly_hours: weeklyHours ? parseInt(weeklyHours) : null,
          timezone,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Could not update project");
      }

      router.push(editingAsAdmin ? `/projects/${id}` : "/my-projects");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPosition() {
    if (!newRoleName.trim()) return;
    setAddingPosition(true);

    try {
      const res = await authFetch(`${API_URL}/projects/${id}/positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_name: newRoleName,
          description: newRoleDescription,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Could not add position");
      }

      const created = await res.json();
      setPositions([...positions, created]);
      setNewRoleName("");
      setNewRoleDescription("");
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingPosition(false);
    }
  }

  async function handleDeletePosition(positionId) {
    await authFetch(`${API_URL}/projects/${id}/positions/${positionId}`, {
      method: "DELETE",
    });
    setPositions(positions.filter((p) => p.id !== positionId));
  }

  if (loading) {
    return <p className="text-center text-secondary py-20">Loading...</p>;
  }

  if (error && !title) {
    return <p className="text-center text-red-500 py-20">{error}</p>;
  }

  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <FloatingTechLogosFixed />
      <div className="max-w-lg mx-auto">
        <h1 className={"text-3xl font-semibold text-navy " + (editingAsAdmin ? "mb-2" : "mb-8")}>Edit project</h1>
        {editingAsAdmin && (
          <p className="text-sm text-secondary mb-8">Editing as admin — this isn&apos;t your project.</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Project title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />

          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />

          <input
            type="text"
            placeholder="Tech stack (comma separated, e.g. React, FastAPI)"
            value={techStack}
            onChange={(e) => setTechStack(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />

          <input
            type="url"
            placeholder="GitHub repository URL"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />

          <select
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy focus:outline-none focus:border-accent"
          >
            {PROJECT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <div className="flex gap-4">
            <input
              type="number"
              placeholder="Duration (weeks)"
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
            />
            <input
              type="number"
              placeholder="Hours / week"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
            />
          </div>

          <input
            type="text"
            placeholder="Timezone (e.g. Europe/Helsinki)"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />

          <div className="border-t border-slate-200 pt-4 mt-2">
            <p className="text-sm font-semibold text-navy mb-3">Open positions</p>

            <div className="flex flex-col gap-2 mb-3">
              {positions.map((position) => (
                <div key={position.id} className="flex items-center justify-between border border-card-border rounded-lg px-3 py-2 bg-card">
                  <div>
                    <p className="text-sm font-medium text-navy">{position.role_name}</p>
                    {position.description && (
                      <p className="text-xs text-secondary">{position.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePosition(position.id)}
                    className="px-2 text-secondary hover:text-red-500 shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {positions.length === 0 && (
                <p className="text-sm text-secondary">No positions yet.</p>
              )}
            </div>

            <div className="flex gap-2">
              <select
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-navy focus:outline-none focus:border-accent text-sm"
              >
                <option value="">Select a role</option>
                {POSITION_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Description (optional)"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent text-sm"
              />
              <button
                type="button"
                onClick={handleAddPosition}
                disabled={addingPosition}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-navy hover:bg-surface disabled:opacity-50 shrink-0"
              >
                Add
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 mt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/my-projects")}
              className="px-4 py-2 text-secondary hover:text-navy"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
