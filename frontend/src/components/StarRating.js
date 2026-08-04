"use client";

import { useState } from "react";
import { IconStar, IconStarFilled } from "@/components/icons/TablerIcons";

// Read-only star display for an average rating (e.g. 4.3 out of 5, rounded to the nearest star).
export function StarRatingDisplay({ rating, size = "w-4 h-4" }) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) =>
        n <= rounded ? (
          <IconStarFilled key={n} className={`${size} text-gold`} />
        ) : (
          <IconStar key={n} className={`${size} text-secondary`} />
        )
      )}
    </span>
  );
}

// Interactive 1-5 star picker, used in the "rate your teammate" feedback form.
export function StarRatingInput({ value, onChange, size = "w-6 h-6" }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <span className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="text-gold"
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          {n <= active ? <IconStarFilled className={size} /> : <IconStar className={size} />}
        </button>
      ))}
    </span>
  );
}
