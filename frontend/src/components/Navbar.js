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
    <nav className="flex items-center justify-between max-w-5xl mx-auto px-6 py-4 w-full">
      <a href="/" className="text-lg font-semibold text-zinc-900 dark:text-white">
        &lt;/&gt; ErNord
      </a>

      <div className="flex items-center gap-4 text-sm">
        <a href="/discover" className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white">
          Discover
        </a>

        {isLoggedIn ? (
          <>
            <a href="/create-project" className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white">
              Publish project
            </a>
            <a href="/my-projects" className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white">
              My projects
            </a>
            <a href="/profile" className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white">
              Profile
            </a>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <a href="/login" className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white">
              Log in
            </a>
            <a href="/register" className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">
              Sign up
            </a>
          </>
        )}
      </div>
    </nav>
  );
}