"use client";

import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import IconBadge from "@/components/IconBadge";
import { IconLogin } from "@/components/icons/TablerIcons";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const params = new URLSearchParams({ email, password });
      const res = await fetch(`http://127.0.0.1:8000/login?${params}`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Something went wrong");
      }

      const data = await res.json();
      localStorage.setItem("devgym_token", data.access_token);
      localStorage.setItem("devgym_user_id", data.user_id);

      window.location.href = "/";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 py-12">
      <ScrollReveal className="w-full max-w-sm">
        <div className="flex justify-center mb-4">
          <IconBadge icon={IconLogin} color="blue" />
        </div>
        <h1 className="text-3xl font-semibold text-navy mb-6 text-center">Log in to DevGym</h1>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 border border-slate-200 rounded-xl shadow-sm bg-white p-6"
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-sm text-secondary text-center mt-6">
          Don&apos;t have an account? <a href="/register" className="text-navy font-medium">Sign up</a>
        </p>
      </ScrollReveal>
    </div>
  );
}
