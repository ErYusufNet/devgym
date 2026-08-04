"use client";

import { useEffect, useState } from "react";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import ScrollReveal from "@/components/ScrollReveal";
import IconBadge from "@/components/IconBadge";
import CompletionRateRing from "@/components/CompletionRateRing";
import ReputationSummary from "@/components/ReputationSummary";
import FloatingTechLogosFixed from "@/components/FloatingTechLogosFixed";
import { StarRatingDisplay } from "@/components/StarRating";
import { IconBriefcase, IconSchool, IconCode, IconFolder } from "@/components/icons/TablerIcons";
import { authFetch } from "@/lib/authFetch";
import { API_URL } from "@/lib/api";

export default function ProfileView({ userId: userIdProp, editable = false }) {
  const [profile, setProfile] = useState(null);
  const [activity, setActivity] = useState({});
  const [workExperience, setWorkExperience] = useState([]);
  const [education, setEducation] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectingDiscord, setConnectingDiscord] = useState(false);
  const [discordError, setDiscordError] = useState("");
  const [connectingGithub, setConnectingGithub] = useState(false);
  const [githubError, setGithubError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const userId = userIdProp || localStorage.getItem("devgym_user_id");
      if (!userId) {
        setError("Please log in to see your profile.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(API_URL + "/users/" + userId + "/profile");
        if (!res.ok) throw new Error("Could not load profile");
        const data = await res.json();
        setProfile(data);

        const activityRes = await fetch(API_URL + "/users/" + userId + "/activity");
        const activityData = await activityRes.json();
        setActivity(activityData);

        const workRes = await fetch(API_URL + "/users/" + userId + "/work-experience");
        setWorkExperience(await workRes.json());

        const educationRes = await fetch(API_URL + "/users/" + userId + "/education");
        setEducation(await educationRes.json());

        const feedbackRes = await fetch(API_URL + "/users/" + userId + "/feedback");
        setFeedback(await feedbackRes.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [userIdProp]);

  async function handleDeleteWorkExperience(id) {
    await fetch(API_URL + "/work-experience/" + id, { method: "DELETE" });
    setWorkExperience(workExperience.filter((item) => item.id !== id));
  }

  async function handleDeleteEducation(id) {
    await fetch(API_URL + "/education/" + id, { method: "DELETE" });
    setEducation(education.filter((item) => item.id !== id));
  }

  async function handleConnectDiscord() {
    setConnectingDiscord(true);
    setDiscordError("");
    try {
      const res = await authFetch(`${API_URL}/discord/connect`);
      if (!res.ok) throw new Error("Could not start Discord connection");
      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      setConnectingDiscord(false);
      setDiscordError(err.message);
    }
  }

  async function handleConnectGithub() {
    setConnectingGithub(true);
    setGithubError("");
    try {
      const res = await authFetch(`${API_URL}/github/connect`);
      if (!res.ok) throw new Error("Could not start GitHub connection");
      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      setConnectingGithub(false);
      setGithubError(err.message);
    }
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
      <FloatingTechLogosFixed />
      <div className="max-w-2xl mx-auto">
        <ScrollReveal className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center text-xl font-medium text-navy">
              {profile.full_name ? profile.full_name[0].toUpperCase() : "?"}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-navy">{profile.full_name}</h1>
              <p className="text-sm text-secondary">{profile.email}</p>
            </div>
          </div>

          {editable && (
            <a
              href="/profile/edit"
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-navy hover:bg-surface whitespace-nowrap"
            >
              Edit profile
            </a>
          )}
        </ScrollReveal>

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

          {editable && (
            profile.discord_id ? (
              <span className="px-3 py-1 rounded-md bg-green-600/10 text-green-600 font-medium">
                Discord connected ✓
              </span>
            ) : (
              <button
                onClick={handleConnectDiscord}
                disabled={connectingDiscord}
                className="px-3 py-1 rounded-md border border-slate-300 text-navy hover:bg-surface disabled:opacity-50"
              >
                {connectingDiscord ? "Connecting..." : "Connect Discord"}
              </button>
            )
          )}

          {editable && (
            profile.github_connected ? (
              <span className="px-3 py-1 rounded-md bg-green-600/10 text-green-600 font-medium">
                GitHub connected ✓ (@{profile.github_username})
              </span>
            ) : (
              <button
                onClick={handleConnectGithub}
                disabled={connectingGithub}
                className="px-3 py-1 rounded-md border border-slate-300 text-navy hover:bg-surface disabled:opacity-50"
              >
                {connectingGithub ? "Connecting..." : "Connect GitHub"}
              </button>
            )
          )}
        </div>

        {discordError && <p className="text-sm text-red-500 -mt-6 mb-8">{discordError}</p>}
        {githubError && <p className="text-sm text-red-500 -mt-6 mb-8">{githubError}</p>}

        <ReputationSummary reputation={profile.reputation} feedback={feedback} />

        {profile.skills && profile.skills.length > 0 && (
          <ScrollReveal className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <IconBadge icon={IconCode} color="pink" size="sm" />
              <h2 className="text-base font-semibold text-navy">Skills</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span key={skill} className="text-xs px-2 py-1 rounded-md bg-surface text-navy">{skill}</span>
              ))}
            </div>
          </ScrollReveal>
        )}

        <ScrollReveal className="mb-10 border border-card-border rounded-xl bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <IconBadge icon={IconBriefcase} color="blue" size="sm" />
              <h2 className="text-base font-semibold text-navy">Work experience</h2>
            </div>
            {editable && (
              <a
                href="/profile/work-experience/new"
                className="text-xs px-2 py-1 rounded-md border border-slate-300 text-navy hover:bg-surface"
              >
                + Add
              </a>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {workExperience.map((item) => (
              <div key={item.id} className="border border-card-border rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                <IconBadge icon={IconBriefcase} color="blue" size="sm" />
                <div className="flex-1 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-navy">{item.role} · {item.company}</p>
                    <p className="text-xs text-secondary mb-1">{item.start_date} – {item.end_date || "Present"}</p>
                    {item.description && <p className="text-sm text-secondary">{item.description}</p>}
                  </div>
                  {editable && (
                    <button
                      onClick={() => handleDeleteWorkExperience(item.id)}
                      className="text-secondary hover:text-red-500 shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
            {workExperience.length === 0 && (
              <p className="text-sm text-secondary">No work experience added yet.</p>
            )}
          </div>
        </ScrollReveal>

        <ScrollReveal className="mb-10 border border-card-border rounded-xl bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <IconBadge icon={IconSchool} color="purple" size="sm" />
              <h2 className="text-base font-semibold text-navy">Education</h2>
            </div>
            {editable && (
              <a
                href="/profile/education/new"
                className="text-xs px-2 py-1 rounded-md border border-slate-300 text-navy hover:bg-surface"
              >
                + Add
              </a>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {education.map((item) => (
              <div key={item.id} className="border border-card-border rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                <IconBadge icon={IconSchool} color="purple" size="sm" />
                <div className="flex-1 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-navy">{item.degree} · {item.school}</p>
                    <p className="text-xs text-secondary mb-1">{item.start_date} – {item.end_date || "Present"}</p>
                    {item.description && <p className="text-sm text-secondary">{item.description}</p>}
                  </div>
                  {editable && (
                    <button
                      onClick={() => handleDeleteEducation(item.id)}
                      className="text-secondary hover:text-red-500 shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
            {education.length === 0 && (
              <p className="text-sm text-secondary">No education added yet.</p>
            )}
          </div>
        </ScrollReveal>

        <ScrollReveal className="mb-10 border border-card-border rounded-xl bg-card p-6 shadow-sm">
          <ActivityHeatmap activity={activity} />
        </ScrollReveal>

        <ScrollReveal className="mb-10 border border-card-border rounded-xl bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <IconBadge icon={IconFolder} color="blue" size="sm" />
            <h2 className="text-base font-semibold text-navy">Projects published ({profile.owned_projects.length})</h2>
          </div>
          <div className="flex flex-col gap-2">
            {profile.owned_projects.map((p) => (
              <a key={p.id} href={"/projects/" + p.id} className="border border-card-border rounded-xl px-4 py-3 text-sm text-navy bg-white shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                <span>{p.title}</span>
                <span className="text-xs text-secondary capitalize">{p.status}</span>
              </a>
            ))}
            {profile.owned_projects.length === 0 && (
              <p className="text-sm text-secondary">No projects published yet.</p>
            )}
          </div>
        </ScrollReveal>

        <ScrollReveal className="border border-card-border rounded-xl bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <IconBadge icon={IconFolder} color="purple" size="sm" />
              <h2 className="text-base font-semibold text-navy">Projects joined ({profile.joined_projects.length})</h2>
            </div>
            <CompletionRateRing
              completed={profile.joined_completed_count}
              total={profile.joined_total_count}
              rate={profile.completion_rate}
            />
          </div>
          <div className="flex flex-col gap-2">
            {profile.joined_projects.map((p) => (
              <a key={p.id} href={"/projects/" + p.id} className="border border-card-border rounded-xl px-4 py-3 text-sm text-navy bg-white shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                <span>{p.title}</span>
                <div className="flex items-center gap-3 shrink-0">
                  {p.avg_rating != null && (
                    <span className="flex items-center gap-1">
                      <StarRatingDisplay rating={p.avg_rating} size="w-3.5 h-3.5" />
                      <span className="text-xs text-secondary">{p.avg_rating}</span>
                    </span>
                  )}
                  <span className="text-xs text-secondary capitalize">{p.status}</span>
                </div>
              </a>
            ))}
            {profile.joined_projects.length === 0 && (
              <p className="text-sm text-secondary">Haven&apos;t joined any projects yet.</p>
            )}
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
