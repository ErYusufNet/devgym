"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ScrollReveal from "@/components/ScrollReveal";
import IconBadge from "@/components/IconBadge";
import { IconShieldCheck } from "@/components/icons/TablerIcons";
import FloatingTechLogosFixed from "@/components/FloatingTechLogosFixed";
import { API_URL } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Missing or invalid reset link.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Something went wrong");
      }

      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollReveal className="w-full max-w-sm">
      <div className="flex justify-center mb-4">
        <IconBadge icon={IconShieldCheck} color="teal" />
      </div>
      <h1 className="text-3xl font-semibold text-navy mb-6 text-center">Choose a new password</h1>

      {done ? (
        <div className="border border-card-border rounded-xl shadow-sm bg-card p-6 text-center">
          <p className="text-navy">Password has been reset. Redirecting to log in...</p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 border border-card-border rounded-xl shadow-sm bg-card p-6"
        >
          {!token && (
            <p className="text-sm text-red-500">
              This reset link is missing its token. Please request a new one.
            </p>
          )}
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || !token}
            className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
      )}

      <p className="text-sm text-secondary text-center mt-6">
        Remembered your password? <a href="/login" className="text-navy font-medium">Log in</a>
      </p>
    </ScrollReveal>
  );
}

export default function ResetPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 py-12">
      <FloatingTechLogosFixed />
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
