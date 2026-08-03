"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    if (!userId) {
      setError("Please log in to add education.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/users/" + userId + "/education", {
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
    <div className="min-h-screen bg-white dark:bg-zinc-950 px-6 py-12">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-8">Add education</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="School"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            required
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
          />

          <input
            type="text"
            placeholder="Degree (e.g. B.Sc. Computer Science)"
            value={degree}
            onChange={(e) => setDegree(e.target.value)}
            required
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
          />

          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Start date (e.g. 2018-09)"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            />
            <input
              type="text"
              placeholder="End date (leave empty if current)"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            />
          </div>

          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 mt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add education"}
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
