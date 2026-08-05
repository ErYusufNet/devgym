"use client";

import { useState } from "react";
import { StarRatingInput } from "@/components/StarRating";

export default function RateTeammateCard({ teammate, onSubmit }) {
  const [communication, setCommunication] = useState(0);
  const [reliability, setReliability] = useState(0);
  const [codeQuality, setCodeQuality] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = communication > 0 && reliability > 0 && codeQuality > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit({
        to_user_id: teammate.id,
        communication,
        reliability,
        code_quality: codeQuality,
        comment: comment.trim() || null,
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="border border-card-border rounded-xl p-5 bg-card shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center text-xs font-semibold shrink-0">
          {(teammate.full_name || teammate.email || "?")[0].toUpperCase()}
        </div>
        <p className="text-sm font-medium text-navy">{teammate.full_name || teammate.email}</p>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-secondary">Communication</span>
          <StarRatingInput value={communication} onChange={setCommunication} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-secondary">Reliability</span>
          <StarRatingInput value={reliability} onChange={setReliability} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-secondary">Code quality</span>
          <StarRatingInput value={codeQuality} onChange={setCodeQuality} />
        </div>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment..."
        rows={2}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent resize-none text-sm mb-3"
      />

      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0"
      >
        {submitting ? "Submitting..." : "Submit feedback"}
      </button>
    </div>
  );
}
