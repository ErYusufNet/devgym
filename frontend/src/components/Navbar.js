"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { API_URL } from "@/lib/api";
import { IconMenu2, IconX } from "@/components/icons/TablerIcons";

const ADMIN_EMAIL = "ernordbusiness@hotmail.com";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendState, setResendState] = useState("idle"); // "idle" | "sending" | "sent"
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("devgym_token");
    setIsLoggedIn(!!token);
    if (!token) return;

    // /login stores this flag straight from its response (see login/page.js).
    // Profile edits and re-logins keep it fresh; verifying in another tab only
    // updates it once this tab logs in again, which matches "banner reflects
    // the state as of last login" being good enough for a non-blocking nudge.
    setNeedsVerification(localStorage.getItem("devgym_email_verified") === "false");

    // Purely a UI convenience to hide/show the Admin link — the actual gate is
    // require_admin on the backend, so there's nothing sensitive being decided here.
    const userId = localStorage.getItem("devgym_user_id");
    if (!userId) return;
    fetch(`${API_URL}/users/${userId}/profile`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setIsAdmin(data?.email === ADMIN_EMAIL);
        if (data?.email) setUserEmail(data.email);
        // Profile is the source of truth if it disagrees with the stale
        // localStorage flag (e.g. verified in another tab, then this tab
        // navigated without a fresh login).
        if (typeof data?.email_verified === "boolean") {
          setNeedsVerification(!data.email_verified);
          localStorage.setItem("devgym_email_verified", data.email_verified ? "true" : "false");
        }
      })
      .catch(() => {});
  }, []);

  async function handleResendVerification() {
    setResendState("sending");
    try {
      await fetch(`${API_URL}/resend-verification-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });
    } catch {
      // Best-effort — the endpoint always returns a generic message anyway,
      // so there's nothing more specific to show on failure here.
    } finally {
      setResendState("sent");
    }
  }

  // Close the mobile drawer whenever the viewport grows back past the md
  // breakpoint, so it can't be left open (and hidden) behind the desktop nav.
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) setMobileOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function handleLogout() {
    localStorage.removeItem("devgym_token");
    localStorage.removeItem("devgym_user_id");
    localStorage.removeItem("devgym_email_verified");
    window.location.href = "/";
  }

  const linkClass =
    "px-3 py-2.5 rounded-lg text-secondary hover:text-navy hover:bg-card transition-colors duration-200";
  const mobileLinkClass =
    "px-3 py-3 rounded-lg text-secondary hover:text-navy hover:bg-card transition-colors duration-200 text-base";

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between max-w-5xl mx-auto px-6 py-4 w-full">
        <a href="/" className="flex items-center shrink-0">
          <Image
            src="/ernord-logo-navbar.png"
            alt="Ernord"
            width={53}
            height={36}
            priority
            className="h-9 w-auto"
          />
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 text-sm">
          <a href="/discover" className={linkClass}>Discover</a>
          <a href="/completed" className={linkClass}>Showcase</a>
          <a href="/talent" className={linkClass}>Find Talent</a>

          {isLoggedIn ? (
            <>
              <a href="/create-project" className={linkClass}>Publish project</a>
              <a href="/my-projects" className={linkClass}>My projects</a>
              <a href="/profile" className={linkClass}>Profile</a>
              {isAdmin && <a href="/admin" className={linkClass}>Admin</a>}
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-navy hover:bg-card transition-colors duration-200"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <a href="/login" className={linkClass}>Log in</a>
              <a
                href="/register"
                className="px-3 py-1.5 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:-translate-y-0.5"
              >
                Sign up
              </a>
            </>
          )}
        </div>

        {/* Mobile hamburger toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          className="md:hidden flex items-center justify-center w-11 h-11 -mr-2 rounded-lg text-navy hover:bg-card transition-colors duration-200"
        >
          {mobileOpen ? <IconX className="w-6 h-6" /> : <IconMenu2 className="w-6 h-6" />}
        </button>
      </div>

      {/* Persistent nudge for a logged-in-but-unverified account — verification
          itself isn't gated at login (see backend /login), only at the actions
          that matter (creating/applying to a project), so this is advisory
          rather than blocking. */}
      {isLoggedIn && needsVerification && (
        <div className="border-t border-amber-200 bg-amber-50 px-6 py-2">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-amber-800 text-center">
            <span>Please verify your email address to publish projects or apply to one.</span>
            {resendState === "sent" ? (
              <span className="text-amber-700">If that email is registered, a new confirmation link is on its way.</span>
            ) : (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendState === "sending"}
                className="font-medium underline disabled:opacity-50"
              >
                {resendState === "sending" ? "Sending..." : "Resend confirmation email"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-6 py-3">
          <div className="flex flex-col gap-1 text-sm">
            <a href="/discover" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Discover</a>
            <a href="/completed" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Showcase</a>
            <a href="/talent" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Find Talent</a>

            {isLoggedIn ? (
              <>
                <a href="/create-project" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Publish project</a>
                <a href="/my-projects" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>My projects</a>
                <a href="/profile" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Profile</a>
                {isAdmin && (
                  <a href="/admin" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Admin</a>
                )}
                <button
                  onClick={handleLogout}
                  className="mt-1 px-3 py-3 rounded-lg border border-slate-300 text-navy hover:bg-card transition-colors duration-200 text-base text-left"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <a href="/login" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Log in</a>
                <a
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="mt-1 px-3 py-3 bg-accent text-white rounded-lg font-medium text-center hover:bg-accent-hover transition-colors duration-200"
                >
                  Sign up
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
