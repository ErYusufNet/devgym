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
    <nav className="border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between max-w-5xl mx-auto px-6 py-4 w-full">
        <a href="/" className="text-lg font-semibold text-navy tracking-tight">
          Ernord
        </a>

        <div className="flex items-center gap-6 text-sm">
          <a href="/discover" className="text-secondary hover:text-navy">
            Discover
          </a>
          <a href="/completed" className="text-secondary hover:text-navy">
            Showcase
          </a>

          {isLoggedIn ? (
            <>
              <a href="/create-project" className="text-secondary hover:text-navy">
                Publish project
              </a>
              <a href="/my-projects" className="text-secondary hover:text-navy">
                My projects
              </a>
              <a href="/profile" className="text-secondary hover:text-navy">
                Profile
              </a>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-navy hover:bg-surface"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <a href="/login" className="text-secondary hover:text-navy">
                Log in
              </a>
              <a href="/register" className="px-3 py-1.5 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover">
                Sign up
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
