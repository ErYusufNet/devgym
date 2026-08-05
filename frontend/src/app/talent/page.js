"use client";

import { useCallback, useEffect, useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { StarRatingDisplay } from "@/components/StarRating";
import FloatingTechLogosFixed from "@/components/FloatingTechLogosFixed";
import { IconChevronDown } from "@/components/icons/TablerIcons";
import { POSITION_ROLES } from "@/lib/roles";
import { API_URL } from "@/lib/api";

const EXPERIENCE_LEVELS = ["student", "junior", "mid", "senior"];

export default function Talent() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [skills, setSkills] = useState("");
  const [minYears, setMinYears] = useState("");
  const [languages, setLanguages] = useState("");
  const [title, setTitle] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (skills) params.set("skills", skills);
      if (minYears) params.set("min_years_experience", minYears);
      if (languages) params.set("languages", languages);
      if (title) params.set("title", title);
      if (experienceLevel) params.set("experience_level", experienceLevel);

      const res = await fetch(`${API_URL}/users/search?${params}`);
      if (!res.ok) throw new Error("Could not load candidates");
      const data = await res.json();
      setCandidates(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [skills, minYears, languages, title, experienceLevel]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchCandidates();
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchCandidates]);

  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <FloatingTechLogosFixed />
      <div className="max-w-2xl mx-auto">
        <ScrollReveal className="mb-10">
          <h1 className="text-3xl font-semibold text-navy mb-2">Find talent</h1>
          <p className="text-secondary">Search developers by skill, experience, and language to build your team.</p>
        </ScrollReveal>

        <ScrollReveal className="mb-8">
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-expanded={filtersOpen}
            className="flex items-center justify-between w-full mb-3 text-sm font-medium text-navy"
          >
            Filters
            <IconChevronDown
              className={
                "w-4 h-4 text-secondary transition-transform duration-200 ease-out " +
                (filtersOpen ? "rotate-180" : "")
              }
            />
          </button>

          {filtersOpen && (
          <div className="border border-card-border rounded-xl p-5 bg-card shadow-sm grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-secondary">Skills</label>
              <input
                type="text"
                placeholder="e.g. React, Python"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-navy text-sm placeholder:text-secondary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-secondary">Min years of experience</label>
              <input
                type="number"
                min="0"
                placeholder="Any"
                value={minYears}
                onChange={(e) => setMinYears(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-navy text-sm placeholder:text-secondary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-secondary">Languages</label>
              <input
                type="text"
                placeholder="e.g. English, Finnish"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-navy text-sm placeholder:text-secondary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-secondary">Title</label>
              <select
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-navy text-sm focus:outline-none focus:border-accent"
              >
                <option value="">Any title</option>
                {POSITION_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-secondary">Experience level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-navy text-sm capitalize focus:outline-none focus:border-accent"
              >
                <option value="">Any level</option>
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level} value={level} className="capitalize">{level}</option>
                ))}
              </select>
            </div>
          </div>
          )}
        </ScrollReveal>

        {loading && <p className="text-secondary">Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <div className="flex flex-col gap-5">
          {candidates.map((candidate, i) => (
            <ScrollReveal key={candidate.id} delay={(i % 4) * 80}>
              <a
                href={`/profile/${candidate.id}`}
                className="block border border-card-border rounded-xl p-6 bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center text-base font-semibold shrink-0">
                      {(candidate.full_name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-navy">{candidate.full_name || "Unnamed developer"}</p>
                      <p className="text-sm text-secondary">
                        {candidate.preferred_title}
                        {candidate.preferred_title && candidate.years_of_experience != null && " · "}
                        {candidate.years_of_experience != null && `${candidate.years_of_experience} yrs experience`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {candidate.experience_level && (
                      <span className="text-xs px-2 py-1 rounded-md bg-surface text-secondary capitalize">
                        {candidate.experience_level}
                      </span>
                    )}
                    {candidate.reputation.avg_overall != null && (
                      <div className="flex items-center gap-1.5">
                        <StarRatingDisplay rating={candidate.reputation.avg_overall} size="w-3.5 h-3.5" />
                        <span className="text-xs text-secondary">{candidate.reputation.avg_overall}</span>
                      </div>
                    )}
                  </div>
                </div>

                {candidate.bio && (
                  <p className="text-sm text-secondary mb-3">{candidate.bio}</p>
                )}

                {candidate.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {candidate.skills.map((skill) => (
                      <span key={skill} className="text-xs px-2 py-1 rounded-md bg-surface text-navy">{skill}</span>
                    ))}
                  </div>
                )}

                {candidate.languages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {candidate.languages.map((lang) => (
                      <span key={lang} className="text-xs px-2 py-1 rounded-full bg-violet-600/10 text-violet-600">{lang}</span>
                    ))}
                  </div>
                )}
              </a>
            </ScrollReveal>
          ))}
        </div>

        {!loading && candidates.length === 0 && (
          <p className="text-secondary">No developers match your filters.</p>
        )}
      </div>
    </div>
  );
}
