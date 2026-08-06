"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { API_URL } from "@/lib/api";

function StatCard({ label, value }) {
  return (
    <div className="border border-card-border rounded-xl p-4 bg-card shadow-sm">
      <p className="text-2xl font-semibold text-navy">{value}</p>
      <p className="text-xs text-secondary mt-1">{label}</p>
    </div>
  );
}

export default function AdminPanel() {
  // null = still checking, "denied" | "ok" once resolved.
  const [access, setAccess] = useState(null);

  const [stats, setStats] = useState(null);
  const [pendingRecruiters, setPendingRecruiters] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [projects, setProjects] = useState([]);

  const [message, setMessage] = useState("");
  const [confirmTarget, setConfirmTarget] = useState(null); // { type: "user" | "project", id, label }
  const [working, setWorking] = useState(false);

  useEffect(() => {
    async function checkAccessAndLoad() {
      const res = await authFetch(`${API_URL}/admin/stats`);
      if (res.status === 403 || res.status === 401) {
        setAccess("denied");
        return;
      }
      setStats(await res.json());
      setAccess("ok");
      try {
        const [recruitersRes, projectsRes] = await Promise.all([
          authFetch(`${API_URL}/admin/pending-recruiters`),
          authFetch(`${API_URL}/admin/projects`),
        ]);
        setPendingRecruiters(await recruitersRes.json());
        setProjects(await projectsRes.json());
      } catch {
        setMessage("Some admin data failed to load.");
      }
    }
    checkAccessAndLoad();
  }, []);

  const fetchUsers = useCallback(async () => {
    if (access !== "ok") return;
    try {
      const params = new URLSearchParams();
      if (userSearch) params.set("search", userSearch);
      const res = await authFetch(`${API_URL}/admin/users?${params}`);
      setUsers(await res.json());
    } catch {
      setMessage("Could not load users.");
    }
  }, [access, userSearch]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchUsers]);

  async function refreshStats() {
    try {
      const res = await authFetch(`${API_URL}/admin/stats`);
      setStats(await res.json());
    } catch {
      // non-fatal — stats will just be stale until next load
    }
  }

  async function refreshProjects() {
    try {
      const res = await authFetch(`${API_URL}/admin/projects`);
      setProjects(await res.json());
    } catch {
      // non-fatal — projects will just be stale until next load
    }
  }

  async function handleApprove(id) {
    setMessage("");
    try {
      const res = await authFetch(`${API_URL}/admin/approve-recruiter/${id}`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).detail || "Could not approve recruiter");
      setPendingRecruiters((prev) => prev.filter((r) => r.id !== id));
      refreshStats();
      fetchUsers();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleReject(id) {
    setMessage("");
    try {
      const res = await authFetch(`${API_URL}/admin/reject-recruiter/${id}`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).detail || "Could not reject recruiter");
      setPendingRecruiters((prev) => prev.filter((r) => r.id !== id));
      refreshStats();
      fetchUsers();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleConfirmDelete() {
    if (!confirmTarget) return;
    setWorking(true);
    setMessage("");

    try {
      const path = confirmTarget.type === "user" ? "users" : "projects";
      const res = await authFetch(`${API_URL}/admin/${path}/${confirmTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).detail || "Could not delete");

      if (confirmTarget.type === "user") {
        setUsers((prev) => prev.filter((u) => u.id !== confirmTarget.id));
        // Deleting a user cascade-deletes any projects they owned server-side —
        // refetch rather than filter locally since we don't know which ones those were.
        refreshProjects();
      } else {
        setProjects((prev) => prev.filter((p) => p.id !== confirmTarget.id));
      }
      refreshStats();
      setConfirmTarget(null);
    } catch (err) {
      setMessage(err.message);
      setConfirmTarget(null);
    } finally {
      setWorking(false);
    }
  }

  if (access === null) {
    return <p className="text-center text-secondary py-20">Loading...</p>;
  }

  if (access === "denied") {
    return <p className="text-center text-red-500 py-20">Access denied</p>;
  }

  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold text-navy mb-8">Admin panel</h1>

        {message && <p className="text-sm text-red-500 mb-4">{message}</p>}

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <StatCard label="Total users" value={stats.total_users} />
            <StatCard label="Total projects" value={stats.total_projects} />
            <StatCard label="Active / Completed" value={`${stats.active_projects} / ${stats.completed_projects}`} />
            <StatCard label="Pending recruiters" value={stats.pending_recruiters} />
          </div>
        )}

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-navy mb-3">Pending recruiters</h2>
          {pendingRecruiters.length === 0 && (
            <p className="text-sm text-secondary">No pending recruiter applications.</p>
          )}
          <div className="flex flex-col gap-2">
            {pendingRecruiters.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-4 border border-card-border rounded-lg p-3"
              >
                <div>
                  <p className="text-sm font-medium text-navy">{r.full_name || r.email}</p>
                  <p className="text-xs text-secondary">
                    {r.email} · {r.company_name || "no company name"} · {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(r.id)}
                    className="text-xs px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 font-medium transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(r.id)}
                    className="text-xs px-3 py-1.5 rounded-md border border-red-300 text-red-600 hover:bg-red-50 font-medium transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-navy mb-3">All users</h2>
          <input
            type="text"
            placeholder="Search by email"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="mb-3 px-3 py-2 border border-slate-300 rounded-lg bg-white text-navy text-sm placeholder:text-secondary focus:outline-none focus:border-accent w-full max-w-xs"
          />
          <div className="flex flex-col gap-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-4 border border-card-border rounded-lg p-3"
              >
                <div>
                  <p className="text-sm font-medium text-navy">{u.full_name || "Unnamed"}</p>
                  <p className="text-xs text-secondary">
                    {u.email} · {u.account_type}
                    {u.account_type === "recruiter" && (u.recruiter_approved ? " (approved)" : " (pending)")}
                    {" · "}
                    {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setConfirmTarget({ type: "user", id: u.id, label: u.email })}
                  className="text-xs px-3 py-1.5 rounded-md border border-red-300 text-red-600 hover:bg-red-50 font-medium transition-colors shrink-0"
                >
                  Delete
                </button>
              </div>
            ))}
            {users.length === 0 && <p className="text-sm text-secondary">No users match.</p>}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-3">All projects</h2>
          <div className="flex flex-col gap-2">
            {projects.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-4 border border-card-border rounded-lg p-3"
              >
                <div>
                  <p className="text-sm font-medium text-navy">{p.title}</p>
                  <p className="text-xs text-secondary">
                    {p.owner_email || "unknown owner"} · {p.status} · {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a
                    href={`/projects/${p.id}/edit`}
                    className="text-xs px-3 py-1.5 rounded-md border border-slate-300 text-navy hover:bg-surface font-medium transition-colors"
                  >
                    Edit
                  </a>
                  <button
                    onClick={() => setConfirmTarget({ type: "project", id: p.id, label: p.title })}
                    className="text-xs px-3 py-1.5 rounded-md border border-red-300 text-red-600 hover:bg-red-50 font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {projects.length === 0 && <p className="text-sm text-secondary">No projects.</p>}
          </div>
        </section>
      </div>

      {confirmTarget && (
        <div
          className="fixed inset-0 bg-navy/40 flex items-center justify-center z-50 px-6"
          onClick={() => !working && setConfirmTarget(null)}
        >
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-navy mb-2">
              Delete {confirmTarget.type === "user" ? "user" : "project"} &quot;{confirmTarget.label}&quot;?
            </h3>
            <p className="text-sm text-secondary mb-6">
              This action cannot be undone{confirmTarget.type === "user" ? " and removes all of their data" : ""}.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmTarget(null)}
                disabled={working}
                className="px-4 py-2 text-sm text-secondary hover:text-navy disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={working}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {working ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
