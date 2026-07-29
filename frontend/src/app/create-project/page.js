"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const ownerId = localStorage.getItem("devgym_user_id");
    if (!ownerId) {
      setError("Please log in to create a project.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`http://127.0.0.1:8000/projects?owner_id=${ownerId}`, {
        method: "POST",
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
        throw new Error(data.detail || "Could not create project");
      }

      const project = await res.json();

      const validPositions = positions.filter((p) => p.role_name.trim() !== "");

      for (const position of validPositions) {
        await fetch(`http://127.0.0.1:8000/projects/${project.id}/positions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role_name: position.role_name,
            description: position.description,
          }),
        });
      }

      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 px-6 py-12">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-8">Publish a project</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Project title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
          />

          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
          />

          <input
            type="text"
            placeholder="Tech stack (comma separated, e.g. React, FastAPI)"
            value={techStack}
            onChange={(e) => setTechStack(e.target.value)}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
          />

          <input
            type="url"
            placeholder="GitHub repository URL"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
          />

          <select
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
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
              className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            />
            <input
              type="number"
              placeholder="Hours / week"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
              className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            />
          </div>

          <input
            type="text"
            placeholder="Timezone (e.g. Europe/Helsinki)"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
          />

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-2">
            <p className="text-sm font-medium text-zinc-900 dark:text-white mb-3">Open positions</p>

            <div className="flex flex-col gap-3">
              {positions.map((position, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Role (e.g. Frontend Developer)"
                    value={position.role_name}
                    onChange={(e) => updatePosition(index, "role_name", e.target.value)}
                    className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={position.description}
                    onChange={(e) => updatePosition(index, "description", e.target.value)}
                    className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm"
                  />
                  {positions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePositionRow(index)}
                      className="px-2 text-zinc-400 hover:text-red-500"
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
              className="text-sm text-zinc-600 dark:text-zinc-400 underline mt-3"
            >
              + Add another position
            </button>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 disabled:opacity-50 mt-2"
          >
            {loading ? "Publishing..." : "Publish project"}
          </button>
        </form>
      </div>
    </div>
  );
}