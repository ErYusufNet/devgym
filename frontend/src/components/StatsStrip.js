"use client";

import { useEffect, useState } from "react";
import Counter from "@/components/Counter";
import { API_URL } from "@/lib/api";

export default function StatsStrip() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/stats`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 gap-8 max-w-xs mx-auto text-center">
      <div>
        <p className="text-4xl font-semibold text-navy">
          <Counter value={stats.developers} suffix="+" />
        </p>
        <p className="text-sm text-secondary mt-1">Developers</p>
      </div>
      <div>
        <p className="text-4xl font-semibold text-navy">
          <Counter value={stats.projects} suffix="+" />
        </p>
        <p className="text-sm text-secondary mt-1">Projects published</p>
      </div>
    </div>
  );
}
