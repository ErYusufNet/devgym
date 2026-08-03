"use client";

import { useEffect, useState } from "react";
import ActivityHeatmap from "@/components/ActivityHeatmap";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [activity, setActivity] = useState({});
  const [workExperience, setWorkExperience] = useState([]);
  const [education, setEducation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const userId = localStorage.getItem("devgym_user_id");
      if (!userId) {
        setError("Please log in to see your profile.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("http://127.0.0.1:8000/users/" + userId + "/profile");
        if (!res.ok) throw new Error("Could not load profile");
        const data = await res.json();
        setProfile(data);

        const activityRes = await fetch("http://127.0.0.1:8000/users/" + userId + "/activity");
        const activityData = await activityRes.json();
        setActivity(activityData);

        const workRes = await fetch("http://127.0.0.1:8000/users/" + userId + "/work-experience");
        setWorkExperience(await workRes.json());

        const educationRes = await fetch("http://127.0.0.1:8000/users/" + userId + "/education");
        setEducation(await educationRes.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleDeleteWorkExperience(id) {
    await fetch("http://127.0.0.1:8000/work-experience/" + id, { method: "DELETE" });
    setWorkExperience(workExperience.filter((item) => item.id !== id));
  }

  async function handleDeleteEducation(id) {
    await fetch("http://127.0.0.1:8000/education/" + id, { method: "DELETE" });
    setEducation(education.filter((item) => item.id !== id));
  }

  if (loading) {
    return <p className="text-center text-secondary py-20">Loading...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-20">{error}</p>;
  }

  const githubUrl = profile.github_username
    ? "https://github.com/" + profile.github_username
    : null;

  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center text-xl font-medium text-navy">
              {profile.full_name ? profile.full_name[0].toUpperCase() : "?"}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-navy">{profile.full_name}</h1>
              <p className="text-sm text-secondary">{profile.email}</p>
            </div>
          </div>

          <a
            href="/profile/edit"
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-navy hover:bg-surface whitespace-nowrap"
          >
            Edit profile
          </a>
        </div>

        <div className="flex flex-wrap gap-3 mb-8 text-sm">
          {profile.experience_level && (
            <span className="px-3 py-1 rounded-md bg-surface text-navy capitalize">
              {profile.experience_level}
            </span>
          )}

          {githubUrl && (
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-md border border-slate-300 text-navy hover:bg-surface">
              {profile.github_username}
            </a>
          )}

          {profile.availability && (
            <span className="px-3 py-1 rounded-md bg-surface text-navy">
              {profile.availability}
            </span>
          )}
        </div>

        {profile.skills && profile.skills.length > 0 && (
          <div className="mb-10">
            <h2 className="text-base font-semibold text-navy mb-2">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span key={skill} className="text-xs px-2 py-1 rounded-md bg-surface text-navy">{skill}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-navy">Work experience</h2>
            <a
              href="/profile/work-experience/new"
              className="text-xs px-2 py-1 rounded-md border border-slate-300 text-navy hover:bg-surface"
            >
              + Add
            </a>
          </div>
          <div className="flex flex-col gap-3">
            {workExperience.map((item) => (
              <div key={item.id} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-navy">{item.role} · {item.company}</p>
                  <p className="text-xs text-secondary mb-1">{item.start_date} – {item.end_date || "Present"}</p>
                  {item.description && <p className="text-sm text-secondary">{item.description}</p>}
                </div>
                <button
                  onClick={() => handleDeleteWorkExperience(item.id)}
                  className="text-secondary hover:text-red-500 shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
            {workExperience.length === 0 && (
              <p className="text-sm text-secondary">No work experience added yet.</p>
            )}
          </div>
        </div>

        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-navy">Education</h2>
            <a
              href="/profile/education/new"
              className="text-xs px-2 py-1 rounded-md border border-slate-300 text-navy hover:bg-surface"
            >
              + Add
            </a>
          </div>
          <div className="flex flex-col gap-3">
            {education.map((item) => (
              <div key={item.id} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-navy">{item.degree} · {item.school}</p>
                  <p className="text-xs text-secondary mb-1">{item.start_date} – {item.end_date || "Present"}</p>
                  {item.description && <p className="text-sm text-secondary">{item.description}</p>}
                </div>
                <button
                  onClick={() => handleDeleteEducation(item.id)}
                  className="text-secondary hover:text-red-500 shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
            {education.length === 0 && (
              <p className="text-sm text-secondary">No education added yet.</p>
            )}
          </div>
        </div>

        <div className="mb-10">
          <ActivityHeatmap activity={activity} />
        </div>

        <div className="mb-10">
          <h2 className="text-base font-semibold text-navy mb-3">Projects published ({profile.owned_projects.length})</h2>
          <div className="flex flex-col gap-2">
            {profile.owned_projects.map((p) => (
              <a key={p.id} href={"/projects/" + p.id} className="border border-slate-200 rounded-lg px-4 py-2 text-sm text-navy hover:bg-surface flex items-center justify-between">
                <span>{p.title}</span>
                <span className="text-xs text-secondary capitalize">{p.status}</span>
              </a>
            ))}
            {profile.owned_projects.length === 0 && (
              <p className="text-sm text-secondary">No projects published yet.</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold text-navy mb-3">Projects joined ({profile.joined_projects.length})</h2>
          <div className="flex flex-col gap-2">
            {profile.joined_projects.map((p) => (
              <a key={p.id} href={"/projects/" + p.id} className="border border-slate-200 rounded-lg px-4 py-2 text-sm text-navy hover:bg-surface flex items-center justify-between">
                <span>{p.title}</span>
                <span className="text-xs text-secondary capitalize">{p.status}</span>
              </a>
            ))}
            {profile.joined_projects.length === 0 && (
              <p className="text-sm text-secondary">Haven&apos;t joined any projects yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
