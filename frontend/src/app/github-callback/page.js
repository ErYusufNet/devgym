"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import { authFetch } from "@/lib/authFetch";

function GithubCallbackHandler() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState("");

  useEffect(() => {
    async function completeConnection() {
      if (!code) {
        setStatus("error");
        setError("Missing GitHub authorization code.");
        return;
      }

      try {
        const res = await authFetch("http://127.0.0.1:8000/github/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || "Could not connect GitHub account");
        }

        setStatus("done");
        // A full navigation (not router.push) so /profile's client-side fetch
        // re-runs on a fresh mount and picks up the github_username/github_connected
        // we just saved — same reasoning as discord-callback/page.js.
        setTimeout(() => {
          window.location.href = "/profile";
        }, 1500);
      } catch (err) {
        setStatus("error");
        setError(err.message);
      }
    }
    completeConnection();
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 py-12">
      <ScrollReveal className="w-full max-w-sm text-center">
        {status === "connecting" && (
          <p className="text-secondary">Connecting your GitHub account...</p>
        )}
        {status === "done" && (
          <p className="text-navy font-medium">GitHub connected! Redirecting...</p>
        )}
        {status === "error" && (
          <>
            <p className="text-red-500 mb-4">{error}</p>
            <Link href="/profile" className="text-accent hover:text-accent-hover font-medium">Back to profile</Link>
          </>
        )}
      </ScrollReveal>
    </div>
  );
}

export default function GithubCallback() {
  return (
    <Suspense fallback={null}>
      <GithubCallbackHandler />
    </Suspense>
  );
}
