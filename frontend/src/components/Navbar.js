"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

const ADMIN_EMAIL = "ernordbusiness@hotmail.com";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("devgym_token");
    setIsLoggedIn(!!token);
    if (!token) return;

    // Purely a UI convenience to hide/show the Admin link — the actual gate is
    // require_admin on the backend, so there's nothing sensitive being decided here.
    const userId = localStorage.getItem("devgym_user_id");
    if (!userId) return;
    fetch(`${API_URL}/users/${userId}/profile`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIsAdmin(data?.email === ADMIN_EMAIL))
      .catch(() => {});
  }, []);

  function handleLogout() {
    localStorage.removeItem("devgym_token");
    localStorage.removeItem("devgym_user_id");
    window.location.href = "/";
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between max-w-5xl mx-auto px-6 py-4 w-full">
        <a href="/" className="text-lg font-semibold text-navy tracking-tight">
          Ernord
        </a>

        <div className="flex items-center gap-1 text-sm">
          <a href="/discover" className="px-3 py-1.5 rounded-lg text-secondary hover:text-navy hover:bg-card transition-colors duration-200">
            Discover
          </a>
          <a href="/completed" className="px-3 py-1.5 rounded-lg text-secondary hover:text-navy hover:bg-card transition-colors duration-200">
            Showcase
          </a>
          <a href="/talent" className="px-3 py-1.5 rounded-lg text-secondary hover:text-navy hover:bg-card transition-colors duration-200">
            Find Talent
          </a>

          {isLoggedIn ? (
            <>
              <a href="/create-project" className="px-3 py-1.5 rounded-lg text-secondary hover:text-navy hover:bg-card transition-colors duration-200">
                Publish project
              </a>
              <a href="/my-projects" className="px-3 py-1.5 rounded-lg text-secondary hover:text-navy hover:bg-card transition-colors duration-200">
                My projects
              </a>
              <a href="/profile" className="px-3 py-1.5 rounded-lg text-secondary hover:text-navy hover:bg-card transition-colors duration-200">
                Profile
              </a>
              {isAdmin && (
                <a href="/admin" className="px-3 py-1.5 rounded-lg text-secondary hover:text-navy hover:bg-card transition-colors duration-200">
                  Admin
                </a>
              )}
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-navy hover:bg-card transition-colors duration-200"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <a href="/login" className="px-3 py-1.5 rounded-lg text-secondary hover:text-navy hover:bg-card transition-colors duration-200">
                Log in
              </a>
              <a
                href="/register"
                className="px-3 py-1.5 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:-translate-y-0.5"
              >
                Sign up
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
