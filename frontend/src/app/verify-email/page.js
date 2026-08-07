"use client";

import { Suspense, useEffect, useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import IconBadge from "@/components/IconBadge";
import { IconShieldCheck } from "@/components/icons/TablerIcons";
import FloatingTechLogosFixed from "@/components/FloatingTechLogosFixed";
import { API_URL } from "@/lib/api";
import { useSearchParams } from "next/navigation";

function VerifyEmailStatus() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // "verifying" | "done" | "error" — lazy initializer so the missing-token case
  // is decided during render instead of a synchronous setState in the effect below.
  const [status, setStatus] = useState(() => (token ? "verifying" : "error"));
  const [error, setError] = useState(() =>
    token ? "" : "This verification link is missing its token. Please request a new one."
  );

  useEffect(() => {
    if (!token) return;

    async function verify() {
      try {
        const res = await fetch(`${API_URL}/verify-email?${new URLSearchParams({ token })}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || "Something went wrong");
        }
        setStatus("done");
      } catch (err) {
        setError(err.message);
        setStatus("error");
      }
    }
    verify();
  }, [token]);

  return (
    <ScrollReveal className="w-full max-w-sm">
      <div className="flex justify-center mb-4">
        <IconBadge icon={IconShieldCheck} color="teal" />
      </div>
      <h1 className="text-3xl font-semibold text-navy mb-6 text-center">Verify your email</h1>

      <div className="border border-card-border rounded-xl shadow-sm bg-card p-6 text-center">
        {status === "verifying" && <p className="text-navy">Verifying your email...</p>}
        {status === "done" && (
          <p className="text-navy">
            Your email has been verified. You can now{" "}
            <a href="/login" className="text-accent hover:text-accent-hover font-medium">
              log in
            </a>
            .
          </p>
        )}
        {status === "error" && <p className="text-sm text-red-500">{error}</p>}
      </div>

      <p className="text-sm text-secondary text-center mt-6">
        Back to <a href="/login" className="text-navy font-medium">Log in</a>
      </p>
    </ScrollReveal>
  );
}

export default function VerifyEmail() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 py-12">
      <FloatingTechLogosFixed />
      <Suspense fallback={null}>
        <VerifyEmailStatus />
      </Suspense>
    </div>
  );
}
