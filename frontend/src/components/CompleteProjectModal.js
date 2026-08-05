"use client";

import { useState } from "react";

export default function CompleteProjectModal({ onCancel, onConfirm, submitting }) {
  const [summary, setSummary] = useState("");

  return (
    <div
      className="fixed inset-0 bg-navy/40 flex items-center justify-center z-50 px-6"
      onClick={() => !submitting && onCancel()}
    >
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-navy mb-2">Mark project as completed?</h3>
        <p className="text-sm text-secondary mb-4">
          Leave a short summary for the showcase — it&apos;s optional, but future visitors will see it.
        </p>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="What did you build? What did the team learn?"
          rows={4}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent resize-none mb-4"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-sm text-secondary hover:text-navy disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(summary)}
            disabled={submitting}
            className="px-4 py-2 text-sm bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0"
          >
            {submitting ? "Completing..." : "Mark as completed"}
          </button>
        </div>
      </div>
    </div>
  );
}
