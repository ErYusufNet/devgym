"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const EXPERIENCE_LEVELS = ["student", "junior", "mid", "senior"];

export default function EditProfile() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [availability, setAvailability] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const userId = localStorage.getItem("devgym_user_id");
      if (!userId) {
        setError("Please log in to edit your profile.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("http://127.0.0.1:8000/users/" + userId + "/profile");
        if (!res.ok) throw new Error("Could not load profile");
        const data = await res.json();

        setFullName(data.full_name || "");
        setBio(data.bio || "");
        setSkills((data.skills || []).join(", "));
        setExperienceLevel(data.experience_level || "");
        setGithubUsername(data.github_username || "");
        setAvailability(data.availability || "");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const userId = localStorage.getItem("devgym_user_id");
    if (!userId) {
      setError("Please log in to edit your profile.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/users/" + userId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          bio,
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          experience_level: experienceLevel || null,
          github_username: githubUsername,
          availability,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Could not update profile");
      }

      router.push("/profile");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-center text-zinc-500 py-20">Loading...</p>;
  }

  if (error && !fullName && !bio) {
    return <p className="text-center text-red-500 py-20">{error}</p>;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 px-6 py-12">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-8">Edit profile</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
          />

          <textarea
            placeholder="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
          />

          <input
            type="text"
            placeholder="Skills (comma separated, e.g. React, FastAPI)"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
          />

          <select
            value={experienceLevel}
            onChange={(e) => setExperienceLevel(e.target.value)}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
          >
            <option value="">Experience level</option>
            {EXPERIENCE_LEVELS.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="GitHub username"
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
          />

          <input
            type="text"
            placeholder="Availability (e.g. 10 hrs/week, evenings)"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 mt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
