"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import { POSITION_ROLES } from "@/lib/roles";
import FloatingTechLogosFixed from "@/components/FloatingTechLogosFixed";
import { API_URL } from "@/lib/api";

// Mirrors backend calculate_experience_level() — used only to preview the derived
// level here; the backend is the source of truth and recomputes it on save.
function previewExperienceLevel(years) {
  const n = Number(years) || 0;
  if (n < 1) return "student";
  if (n < 3) return "junior";
  if (n < 6) return "mid";
  return "senior";
}

export default function EditProfile() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [availability, setAvailability] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [languages, setLanguages] = useState("");
  const [preferredTitle, setPreferredTitle] = useState("");
  const [accountType, setAccountType] = useState("developer");
  const [visibleToRecruiters, setVisibleToRecruiters] = useState(true);

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
        const res = await fetch(API_URL + "/users/" + userId + "/profile");
        if (!res.ok) throw new Error("Could not load profile");
        const data = await res.json();

        setFullName(data.full_name || "");
        setBio(data.bio || "");
        setSkills((data.skills || []).join(", "));
        setGithubUsername(data.github_username || "");
        setAvailability(data.availability || "");
        setYearsOfExperience(data.years_of_experience ?? "");
        setLanguages((data.languages || []).join(", "));
        setPreferredTitle(data.preferred_title || "");
        setAccountType(data.account_type || "developer");
        setVisibleToRecruiters(data.visible_to_recruiters ?? true);
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
    if (!userId || !localStorage.getItem("devgym_token")) {
      setError("Please log in to edit your profile.");
      return;
    }

    setSaving(true);

    try {
      const res = await authFetch(API_URL + "/users/" + userId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          bio,
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          github_username: githubUsername,
          availability,
          years_of_experience: yearsOfExperience ? parseInt(yearsOfExperience) : null,
          languages: languages.split(",").map((l) => l.trim()).filter(Boolean),
          preferred_title: preferredTitle || null,
          ...(accountType === "developer" ? { visible_to_recruiters: visibleToRecruiters } : {}),
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
    return <p className="text-center text-secondary py-20">Loading...</p>;
  }

  if (error && !fullName && !bio) {
    return <p className="text-center text-red-500 py-20">{error}</p>;
  }

  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <FloatingTechLogosFixed />
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-semibold text-navy mb-8">Edit profile</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />

          <textarea
            placeholder="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />

          <input
            type="text"
            placeholder="Skills (comma separated, e.g. React, FastAPI)"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />

          <div className="flex flex-col gap-1">
            <input
              type="number"
              min="0"
              placeholder="Years of experience"
              value={yearsOfExperience}
              onChange={(e) => setYearsOfExperience(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
            />
            <p className="text-xs text-secondary px-1">
              Experience level: <span className="capitalize">{previewExperienceLevel(yearsOfExperience)}</span> (calculated automatically)
            </p>
          </div>

          <input
            type="text"
            placeholder="Languages (comma separated, e.g. English, Finnish, Turkish)"
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />

          <select
            value={preferredTitle}
            onChange={(e) => setPreferredTitle(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy focus:outline-none focus:border-accent"
          >
            <option value="">Preferred title</option>
            {POSITION_ROLES.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="GitHub username"
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />

          <input
            type="text"
            placeholder="Availability (e.g. 10 hrs/week, evenings)"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />

          {accountType === "developer" && (
            <label className="flex items-center justify-between gap-4 px-4 py-3 border border-slate-300 rounded-lg bg-white">
              <span className="text-sm text-navy">
                Visible to recruiters
                <span className="block text-xs text-secondary font-normal mt-0.5">
                  Let approved recruiters find and contact you via Find Talent.
                </span>
              </span>
              <input
                type="checkbox"
                checked={visibleToRecruiters}
                onChange={(e) => setVisibleToRecruiters(e.target.checked)}
                className="w-4 h-4 accent-accent shrink-0"
              />
            </label>
          )}

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
              onClick={() => router.push("/profile")}
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
