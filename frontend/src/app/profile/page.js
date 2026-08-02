"use client";

import { useEffect, useState } from "react";
import ActivityHeatmap from "@/components/ActivityHeatmap";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [activity, setActivity] = useState({});
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
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  if (loading) {
    return <p className="text-center text-zinc-500 py-20">Loading...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-20">{error}</p>;
  }

  const githubUrl = profile.github_username
    ? "https://github.com/" + profile.github_username
    : null;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xl font-medium text-zinc-700 dark:text-zinc-300">
            {profile.full_name ? profile.full_name[0].toUpperCase() : "?"}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">{profile.full_name}</h1>
            <p className="text-sm text-zinc-500">{profile.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-8 text-sm">
          {profile.experience_level && (
            <span className="px-3 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 capitalize">
              {profile.experience_level}
            </span>
          )}

          {githubUrl && (
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 underline">
              {profile.github_username}
            </a>
          )}

          {profile.availability && (
            <span className="px-3 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {profile.availability}
            </span>
          )}
        </div>

        {profile.skills && profile.skills.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-white mb-2">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span key={skill} className="text-xs px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">{skill}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8">
          <ActivityHeatmap activity={activity} />
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">Projects published ({profile.owned_projects.length})</h2>
          <div className="flex flex-col gap-2">
            {profile.owned_projects.map((p) => (
              <a key={p.id} href={"/projects/" + p.id} className="border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center justify-between">
                <span>{p.title}</span>
                <span className="text-xs text-zinc-500 capitalize">{p.status}</span>
              </a>
            ))}
            {profile.owned_projects.length === 0 && (
              <p className="text-sm text-zinc-500">No projects published yet.</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">Projects joined ({profile.joined_projects.length})</h2>
          <div className="flex flex-col gap-2">
            {profile.joined_projects.map((p) => (
              <a key={p.id} href={"/projects/" + p.id} className="border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center justify-between">
                <span>{p.title}</span>
                <span className="text-xs text-zinc-500 capitalize">{p.status}</span>
              </a>
            ))}
            {profile.joined_projects.length === 0 && (
              <p className="text-sm text-zinc-500">Haven&apos;t joined any projects yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}