"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FloatingTechLogosFixed from "@/components/FloatingTechLogosFixed";
import { API_URL } from "@/lib/api";
import { authFetch } from "@/lib/authFetch";

export default function AddEducation() {
  const router = useRouter();

  const [school, setSchool] = useState("");
  const [degree, setDegree] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const userId = localStorage.getItem("devgym_user_id");
    if (!userId || !localStorage.getItem("devgym_token")) {
      setError("Please log in to add education.");
      return;
    }

    setSaving(true);

    try {
      const res = await authFetch(API_URL + "/users/" + userId + "/education", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school,
          degree,
          start_date: startDate,
          end_date: endDate || null,
          description: description || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Could not add education");
      }

      router.push("/profile");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <FloatingTechLogosFixed />
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-semibold text-navy mb-8">Add education</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="School"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            required
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />

          <input
            type="text"
            placeholder="Degree (e.g. B.Sc. Computer Science)"
            value={degree}
            onChange={(e) => setDegree(e.target.value)}
            required
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />

          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Start date (e.g. 2018-09)"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
            />
            <input
              type="text"
              placeholder="End date (leave empty if current)"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
            />
          </div>

          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 mt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0"
            >
              {saving ? "Saving..." : "Add education"}
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
