"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "devgym_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-card-border bg-card shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
      <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center gap-4">
        <p className="text-sm text-secondary flex-1">
          We use cookies to keep you signed in and to understand how Ernord is used. By continuing, you agree to this.
        </p>
        <button
          onClick={handleAccept}
          className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:-translate-y-0.5 shrink-0"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
