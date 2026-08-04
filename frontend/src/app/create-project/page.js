"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ScrollReveal from "@/components/ScrollReveal";
import IconBadge from "@/components/IconBadge";
import { IconRocket, IconUsers } from "@/components/icons/TablerIcons";
import { authFetch } from "@/lib/authFetch";
import { POSITION_ROLES } from "@/lib/roles";
import FloatingTechLogosFixed from "@/components/FloatingTechLogosFixed";

const PROJECT_TYPES = ["web", "mobile", "saas", "desktop", "api", "game", "testing"];

export default function CreateProject() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [projectType, setProjectType] = useState("web");
  const [durationWeeks, setDurationWeeks] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("");
  const [timezone, setTimezone] = useState("");
  const [positions, setPositions] = useState([{ role_name: "", description: "" }]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [connectingGithub, setConnectingGithub] = useState(false);
  const [autoCreateRepo, setAutoCreateRepo] = useState(true);
  const [createdProject, setCreatedProject] = useState(null);
  const [repoError, setRepoError] = useState("");

  useEffect(() => {
    async function loadGithubStatus() {
      const userId = localStorage.getItem("devgym_user_id");
      if (!userId) return;
      try {
        const res = await fetch("http://127.0.0.1:8000/users/" + userId + "/profile");
        if (!res.ok) return;
        const data = await res.json();
        setGithubConnected(!!data.github_connected);
      } catch {
        // Not critical — the manual URL input still works if this fails.
      }
    }
    loadGithubStatus();
  }, []);

  async function handleConnectGithub() {
    setConnectingGithub(true);
    try {
      const res = await authFetch("http://127.0.0.1:8000/github/connect");
      if (!res.ok) throw new Error("Could not start GitHub connection");
      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      setConnectingGithub(false);
      setError(err.message);
    }
  }

  function updatePosition(index, field, value) {
    const updated = [...positions];
    updated[index][field] = value;
    setPositions(updated);
  }

  function addPositionRow() {
    setPositions([...positions, { role_name: "", description: "" }]);
  }

  function removePositionRow(index) {
    setPositions(positions.filter((_, i) => i !== index));
  }

  const willAutoCreateRepo = githubConnected && autoCreateRepo;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setRepoError("");
    setCreatedProject(null);

    if (!localStorage.getItem("devgym_token")) {
      setError("Please log in to create a project.");
      return;
    }

    setLoading(true);

    try {
      const res = await authFetch("http://127.0.0.1:8000/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          tech_stack: techStack.split(",").map((t) => t.trim()).filter(Boolean),
          github_repo_url: willAutoCreateRepo ? "" : githubUrl,
          project_type: projectType,
          duration_weeks: durationWeeks ? parseInt(durationWeeks) : null,
          weekly_hours: weeklyHours ? parseInt(weeklyHours) : null,
          timezone,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Could not create project");
      }

      const project = await res.json();

      const validPositions = positions.filter((p) => p.role_name.trim() !== "");

      for (const position of validPositions) {
        await authFetch(`http://127.0.0.1:8000/projects/${project.id}/positions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role_name: position.role_name,
            description: position.description,
          }),
        });
      }

      if (!willAutoCreateRepo) {
        router.push(`/projects/${project.id}`);
        return;
      }

      // Project already exists at this point — a repo-creation failure here
      // shouldn't be treated as if publishing failed. Stay on this page and
      // let the user retry from the project detail page instead.
      try {
        const repoRes = await authFetch(`http://127.0.0.1:8000/projects/${project.id}/create-repo`, {
          method: "POST",
        });
        const repoData = await repoRes.json();
        if (!repoRes.ok) {
          throw new Error(repoData.detail || "Could not create GitHub repo");
        }
        router.push(`/projects/${project.id}`);
        return;
      } catch (repoErr) {
        setCreatedProject(project);
        setRepoError(repoErr.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <FloatingTechLogosFixed />
      <div className="max-w-lg mx-auto">
        <ScrollReveal className="mb-8">
          <IconBadge icon={IconRocket} color="blue" />
          <h1 className="text-3xl font-semibold text-navy mt-4 mb-2">Publish a project</h1>
          <p className="text-secondary">Share your idea, open up roles, and start building with a team.</p>
        </ScrollReveal>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 border border-card-border rounded-xl shadow-sm bg-card p-6 sm:p-8"
        >
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

          {githubConnected ? (
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-navy">
                <input
                  type="checkbox"
                  checked={autoCreateRepo}
                  onChange={(e) => setAutoCreateRepo(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Auto-create a GitHub repo for this project
              </label>
              {!autoCreateRepo && (
                <input
                  type="url"
                  placeholder="GitHub repository URL"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="px-4 py-3 rounded-lg bg-surface text-sm text-secondary flex items-center justify-between gap-3 flex-wrap">
                <span>Connect your GitHub account to auto-create a repo</span>
                <button
                  type="button"
                  onClick={handleConnectGithub}
                  disabled={connectingGithub}
                  className="px-3 py-1 rounded-md border border-slate-300 text-navy hover:bg-white disabled:opacity-50 shrink-0"
                >
                  {connectingGithub ? "Connecting..." : "Connect GitHub"}
                </button>
              </div>
              <input
                type="url"
                placeholder="GitHub repository URL"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
              />
            </div>
          )}

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
            <div className="flex items-center gap-3 mb-3">
              <IconBadge icon={IconUsers} color="purple" size="sm" />
              <p className="text-sm font-semibold text-navy">Open positions</p>
            </div>

            <div className="flex flex-col gap-3">
              {positions.map((position, index) => (
                <div key={index} className="flex gap-2">
                  <select
                    value={position.role_name}
                    onChange={(e) => updatePosition(index, "role_name", e.target.value)}
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
                    value={position.description}
                    onChange={(e) => updatePosition(index, "description", e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent text-sm"
                  />
                  {positions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePositionRow(index)}
                      className="px-2 text-secondary hover:text-red-500"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addPositionRow}
              className="text-sm text-accent hover:text-accent-hover font-medium mt-3"
            >
              + Add another position
            </button>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {createdProject && repoError && (
            <div className="px-4 py-3 rounded-lg bg-red-50 text-sm text-red-600">
              <p>Project published, but the GitHub repo couldn&apos;t be created: {repoError}</p>
              <a
                href={`/projects/${createdProject.id}`}
                className="font-medium text-accent hover:text-accent-hover"
              >
                View project (you can try again from there) →
              </a>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover disabled:opacity-50 mt-2"
          >
            {loading ? "Publishing..." : "Publish project"}
          </button>
        </form>
      </div>
    </div>
  );
}