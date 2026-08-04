"use client";

import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import IconBadge from "@/components/IconBadge";
import { IconLogin } from "@/components/icons/TablerIcons";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Something went wrong");
      }

      setSent(true);
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
        <h1 className="text-3xl font-semibold text-navy mb-6 text-center">Reset your password</h1>

        {sent ? (
          <div className="border border-slate-200 rounded-xl shadow-sm bg-white p-6 text-center">
            <p className="text-navy">
              If this email is registered, a password reset link has been sent.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 border border-slate-200 rounded-xl shadow-sm bg-white p-6"
          >
            <p className="text-sm text-secondary">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
            />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-sm text-secondary text-center mt-6">
          Remembered your password? <a href="/login" className="text-navy font-medium">Log in</a>
        </p>
      </ScrollReveal>
    </div>
  );
}
