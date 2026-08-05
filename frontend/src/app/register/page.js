"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ScrollReveal from "@/components/ScrollReveal";
import IconBadge from "@/components/IconBadge";
import { IconUserPlus } from "@/components/icons/TablerIcons";
import FloatingTechLogosFixed from "@/components/FloatingTechLogosFixed";
import { API_URL } from "@/lib/api";

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [accountType, setAccountType] = useState("developer");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          years_of_experience: yearsOfExperience ? parseInt(yearsOfExperience) : null,
          account_type: accountType,
          company_name: accountType === "recruiter" ? companyName : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Something went wrong");
      }

      if (accountType === "recruiter") {
        setPendingApproval(true);
      } else {
        router.push("/login");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (pendingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6 py-12">
        <FloatingTechLogosFixed />
        <ScrollReveal className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-4">
            <IconBadge icon={IconUserPlus} color="purple" />
          </div>
          <h1 className="text-2xl font-semibold text-navy mb-3">Account created</h1>
          <div className="border border-card-border rounded-xl shadow-sm bg-card p-6">
            <p className="text-navy font-medium mb-2">Your recruiter account is pending approval</p>
            <p className="text-sm text-secondary">
              We manually review recruiter accounts before granting access to Find Talent. You&apos;ll be able to log in once your account is approved.
            </p>
          </div>
          <p className="text-sm text-secondary text-center mt-6">
            <a href="/login" className="text-navy font-medium">Go to login</a>
          </p>
        </ScrollReveal>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 py-12">
      <FloatingTechLogosFixed />
      <ScrollReveal className="w-full max-w-sm">
        <div className="flex justify-center mb-4">
          <IconBadge icon={IconUserPlus} color="purple" />
        </div>
        <h1 className="text-3xl font-semibold text-navy mb-6 text-center">Create your account</h1>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 border border-card-border rounded-xl shadow-sm bg-card p-6"
        >
          <div className="flex gap-2 p-1 bg-surface rounded-lg">
            <button
              type="button"
              onClick={() => setAccountType("developer")}
              aria-pressed={accountType === "developer"}
              className={
                "flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 " +
                (accountType === "developer" ? "bg-white text-navy shadow-sm" : "text-secondary hover:text-navy")
              }
            >
              Developer
            </button>
            <button
              type="button"
              onClick={() => setAccountType("recruiter")}
              aria-pressed={accountType === "recruiter"}
              className={
                "flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 " +
                (accountType === "recruiter" ? "bg-white text-navy shadow-sm" : "text-secondary hover:text-navy")
              }
            >
              Recruiter
            </button>
          </div>

          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
          />
          {accountType === "developer" && (
            <input
              type="number"
              min="0"
              placeholder="Years of experience (optional)"
              value={yearsOfExperience}
              onChange={(e) => setYearsOfExperience(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
            />
          )}

          {accountType === "recruiter" && (
            <input
              type="text"
              placeholder="Company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent"
            />
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="text-sm text-secondary text-center mt-6">
          Already have an account? <a href="/login" className="text-navy font-medium">Log in</a>
        </p>
      </ScrollReveal>
    </div>
  );
}
