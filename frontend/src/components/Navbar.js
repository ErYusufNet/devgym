"use client";

import { useEffect, useState } from "react";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("devgym_token"));
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
              <a href="/register" className="px-3 py-1.5 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors duration-200">
                Sign up
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
