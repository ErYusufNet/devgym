"use client";

import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import IconBadge from "@/components/IconBadge";
import { IconMail } from "@/components/icons/TablerIcons";
import FloatingTechLogosFixed from "@/components/FloatingTechLogosFixed";
import { API_URL } from "@/lib/api";

const CONTACT_EMAIL = "ernordbusiness@hotmail.com";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Could not send your message");
      }

      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <FloatingTechLogosFixed />
      <div className="max-w-lg mx-auto">
        <ScrollReveal className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <IconBadge icon={IconMail} color="blue" />
          </div>
          <h1 className="text-3xl font-semibold text-navy mb-2">Get in touch</h1>
          <p className="text-secondary">
            Questions, feedback, or partnership ideas — we&apos;d love to hear from you.
          </p>
        </ScrollReveal>

        <ScrollReveal className="mb-8">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="flex items-center justify-center gap-2 border border-card-border rounded-xl p-4 bg-card shadow-sm hover:shadow-md transition-shadow text-sm font-medium text-navy"
          >
            <IconMail className="w-4 h-4 text-accent" />
            {CONTACT_EMAIL}
          </a>
        </ScrollReveal>

        <ScrollReveal>
          {sent ? (
            <div className="border border-card-border rounded-xl shadow-sm bg-card p-6 text-center">
              <p className="text-navy">Thanks for reaching out — we&apos;ll get back to you soon.</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 border border-card-border rounded-xl shadow-sm bg-card p-6 sm:p-8"
            >
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
              />

              <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
              />

              <textarea
                placeholder="How can we help?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                maxLength={3000}
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent resize-none"
              />

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0"
              >
                {loading ? "Sending..." : "Send message"}
              </button>
            </form>
          )}
        </ScrollReveal>
      </div>
    </div>
  );
}
