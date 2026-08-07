"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ScrollReveal from "@/components/ScrollReveal";
import SlideIn from "@/components/SlideIn";
import IconBadge from "@/components/IconBadge";
import HealthBadge from "@/components/HealthBadge";
import { IconUsers, IconHeartHandshake, IconStarFilled } from "@/components/icons/TablerIcons";
import { getProjectTypeMeta } from "@/lib/projectTypeMeta";
import { authFetch } from "@/lib/authFetch";
import CompleteProjectModal from "@/components/CompleteProjectModal";
import RateTeammateCard from "@/components/RateTeammateCard";
import FloatingTechLogosFixed from "@/components/FloatingTechLogosFixed";
import { API_URL } from "@/lib/api";

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [positions, setPositions] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applyingTo, setApplyingTo] = useState(null);
  const [message, setMessage] = useState("");
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [pendingTeammates, setPendingTeammates] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [creatingDiscordRoom, setCreatingDiscordRoom] = useState(false);
  const [discordRoomError, setDiscordRoomError] = useState("");
  const [discordRoomResult, setDiscordRoomResult] = useState(null);
  const [creatingGithubRepo, setCreatingGithubRepo] = useState(false);
  const [githubRepoError, setGithubRepoError] = useState("");
  const [githubRepoResult, setGithubRepoResult] = useState(null);
  const [team, setTeam] = useState([]);
  const [membershipTarget, setMembershipTarget] = useState(null); // { type: "leave" | "remove", memberId, label }
  const [leavingOrRemoving, setLeavingOrRemoving] = useState(false);
  const [teamDirectory, setTeamDirectory] = useState([]);
  const [messagingTo, setMessagingTo] = useState(null); // user_id of the row whose message box is open
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageStatus, setMessageStatus] = useState({}); // { [user_id]: "Message sent!" | error }
  const [myApplications, setMyApplications] = useState({}); // { [position_id]: "pending" | "accepted" | "rejected" }

  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("devgym_user_id") : null;
  const isLoggedIn = typeof window !== "undefined" ? !!localStorage.getItem("devgym_token") : false;

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      const [projectRes, positionsRes, teamRes] = await Promise.all([
        fetch(`${API_URL}/projects/${id}`),
        fetch(`${API_URL}/projects/${id}/positions`),
        fetch(`${API_URL}/projects/${id}/team`),
      ]);

      if (!projectRes.ok) throw new Error("Project not found");

      const projectData = await projectRes.json();
      const positionsData = await positionsRes.json();

      setProject(projectData);
      setPositions(positionsData);
      setTeam(teamRes.ok ? await teamRes.json() : []);

      // Only succeeds for an active member of this project — 403s (silently, as an
      // empty list) for anyone else, which is also how we gate rendering the section.
      if (localStorage.getItem("devgym_token")) {
        const directoryRes = await authFetch(`${API_URL}/projects/${id}/team-directory`);
        setTeamDirectory(directoryRes.ok ? await directoryRes.json() : []);

        const myAppsRes = await authFetch(`${API_URL}/projects/${id}/my-applications`);
        if (myAppsRes.ok) {
          const myApps = await myAppsRes.json();
          setMyApplications(
            Object.fromEntries(myApps.map((a) => [a.position_id, a.status]))
          );
        }
      }

      if (projectData.status === "completed") {
        const commentsRes = await fetch(`${API_URL}/projects/${id}/comments`);
        if (commentsRes.ok) {
          setComments(await commentsRes.json());
        }

        if (localStorage.getItem("devgym_token")) {
          const pendingRes = await authFetch(`${API_URL}/projects/${id}/pending-feedback`);
          if (pendingRes.ok) {
            setPendingTeammates(await pendingRes.json());
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(summary) {
    setCompleting(true);
    setMessage("");
    try {
      const res = await authFetch(`${API_URL}/projects/${id}/complete`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: summary.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Could not mark project as completed");
      }
      await fetchData();
      setShowCompleteModal(false);
      setMessage("Project marked as completed!");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setCompleting(false);
    }
  }

  async function handlePostComment(e) {
    e.preventDefault();
    setCommentError("");

    if (!commentText.trim()) return;

    setPostingComment(true);
    try {
      const res = await authFetch(`${API_URL}/projects/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Could not post comment");
      }
      const newComment = await res.json();
      setComments([...comments, newComment]);
      setCommentText("");
    } catch (err) {
      setCommentError(err.message);
    } finally {
      setPostingComment(false);
    }
  }

  async function handleSubmitFeedback(payload) {
    setFeedbackMessage("");
    const res = await authFetch(`${API_URL}/projects/${id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || "Could not submit feedback");
    }
    setPendingTeammates(pendingTeammates.filter((t) => t.id !== payload.to_user_id));
    setFeedbackMessage("Feedback submitted — thanks!");
  }

  async function handleCreateDiscordRoom() {
    setCreatingDiscordRoom(true);
    setDiscordRoomError("");
    setDiscordRoomResult(null);

    try {
      const res = await authFetch(`${API_URL}/projects/${id}/discord-room`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Could not create Discord room");
      }
      const data = await res.json();
      setDiscordRoomResult(data);
      await fetchData();
    } catch (err) {
      setDiscordRoomError(err.message);
    } finally {
      setCreatingDiscordRoom(false);
    }
  }

  async function handleCreateGithubRepo() {
    setCreatingGithubRepo(true);
    setGithubRepoError("");
    setGithubRepoResult(null);

    try {
      const res = await authFetch(`${API_URL}/projects/${id}/create-repo`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Could not create GitHub repo");
      }
      setGithubRepoResult(data);
      await fetchData();
    } catch (err) {
      setGithubRepoError(err.message);
    } finally {
      setCreatingGithubRepo(false);
    }
  }

  async function handleApply(positionId) {
    setMessage("");

    if (!localStorage.getItem("devgym_token")) {
      setMessage("Please log in to apply.");
      return;
    }

    setApplyingTo(positionId);

    try {
      const res = await authFetch(`${API_URL}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position_id: positionId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Could not apply");
      }

      const data = await res.json();
      setMyApplications((prev) => ({ ...prev, [positionId]: data.status }));
      setMessage("Application sent!");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setApplyingTo(null);
    }
  }

  async function handleConfirmMembershipAction() {
    if (!membershipTarget) return;
    setLeavingOrRemoving(true);
    setMessage("");

    try {
      const path = membershipTarget.type === "leave" ? "leave" : "remove";
      const res = await authFetch(`${API_URL}/team_members/${membershipTarget.memberId}/${path}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Could not update team membership");
      }

      setMessage(
        membershipTarget.type === "leave"
          ? "You've left this project. The position has reopened."
          : `${membershipTarget.label} has been removed. Their position has reopened.`
      );
      setMembershipTarget(null);
      await fetchData(); // refreshes positions (now open again) and the team list
    } catch (err) {
      setMessage(err.message);
      setMembershipTarget(null);
    } finally {
      setLeavingOrRemoving(false);
    }
  }

  async function handleSendMessage(toUserId) {
    if (!messageText.trim()) return;
    setSendingMessage(true);
    setMessageStatus((prev) => ({ ...prev, [toUserId]: "" }));

    try {
      const res = await authFetch(`${API_URL}/projects/${id}/message/${toUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Could not send message");
      }
      setMessageStatus((prev) => ({ ...prev, [toUserId]: "Message sent!" }));
      setMessageText("");
      setMessagingTo(null);
    } catch (err) {
      setMessageStatus((prev) => ({ ...prev, [toUserId]: err.message }));
    } finally {
      setSendingMessage(false);
    }
  }

  if (loading) {
    return <p className="text-center text-secondary py-20">Loading...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-20">{error}</p>;
  }

  const meta = getProjectTypeMeta(project.project_type);
  const isOwner = currentUserId === project.owner_id;
  // The owner can set up (or reopen) the team's Discord room whenever they want —
  // no need to wait for every position to fill first, so a team can start
  // coordinating on Discord from day one if the owner chooses to.
  const canCreateDiscordRoom = isOwner;
  const activeTeam = team.filter((m) => !m.left_at);
  const myMembership = currentUserId
    ? activeTeam.find((m) => m.user_id === currentUserId)
    : null;

  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <FloatingTechLogosFixed />
      <div className="max-w-2xl mx-auto">
        <ScrollReveal>
          <div className="flex items-start justify-between gap-2 flex-wrap mb-4">
            <IconBadge icon={meta.icon} color={meta.color} />
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {project.status === "completed" && (
                <span className="text-xs px-2 py-1 rounded-full bg-green-600/10 text-green-600 font-medium">
                  🎉 Completed
                </span>
              )}
              {project.project_type && (
                <span className="text-xs px-2 py-1 rounded-md bg-surface text-secondary capitalize">
                  {project.project_type}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h1 className="text-2xl sm:text-3xl font-semibold text-navy break-words">{project.title}</h1>
            <HealthBadge health={project.health} />
          </div>
          {project.last_commit_at && (
            <p className="text-xs text-secondary mb-2">
              Last commit: {Math.floor((new Date() - new Date(project.last_commit_at)) / (1000 * 60 * 60 * 24))} days ago
            </p>
          )}
          <p className="text-secondary mb-4">{project.description}</p>

          {currentUserId === project.owner_id && project.status !== "completed" && (
            <button
              onClick={() => setShowCompleteModal(true)}
              className="mb-4 px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-navy hover:bg-surface"
            >
              Mark as completed
            </button>
          )}

          {!isOwner && myMembership && (
            <button
              onClick={() =>
                setMembershipTarget({ type: "leave", memberId: myMembership.id, label: "you" })
              }
              className="mb-4 px-3 py-1.5 rounded-lg border border-red-300 text-sm text-red-600 hover:bg-red-50"
            >
              Leave this project
            </button>
          )}

          {canCreateDiscordRoom && (
            <div className="mb-4">
              {project.discord_invite_url ? (
                <div className="flex flex-wrap gap-2">
                  <a
                    href={project.discord_invite_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-navy hover:bg-surface"
                  >
                    Open Discord room →
                  </a>
                  {project.discord_voice_invite_url && (
                    <a
                      href={project.discord_voice_invite_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-navy hover:bg-surface"
                    >
                      Open voice channel →
                    </a>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleCreateDiscordRoom}
                  disabled={creatingDiscordRoom}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-navy hover:bg-surface disabled:opacity-50"
                >
                  {creatingDiscordRoom ? "Creating Discord room..." : "Create Discord room"}
                </button>
              )}

              {discordRoomError && <p className="text-sm text-red-500 mt-2">{discordRoomError}</p>}

              {discordRoomResult && (
                <div className="mt-2">
                  <p className="text-sm text-navy">
                    Discord room created!{" "}
                    <a
                      href={discordRoomResult.invite_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:text-accent-hover font-medium"
                    >
                      Join here →
                    </a>
                    {discordRoomResult.voice_invite_url && (
                      <>
                        {" "}or{" "}
                        <a
                          href={discordRoomResult.voice_invite_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:text-accent-hover font-medium"
                        >
                          join voice →
                        </a>
                      </>
                    )}
                  </p>
                  {discordRoomResult.not_connected.length > 0 && (
                    <p className="text-xs text-secondary mt-1">
                      {discordRoomResult.not_connected.length} team member{discordRoomResult.not_connected.length === 1 ? " hasn't" : "s haven't"} connected Discord yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {project.status === "completed" && project.completion_summary && (
            <div className="border border-card-border rounded-xl p-5 bg-card mb-6">
              <p className="text-sm font-semibold text-navy mb-2">📝 Project summary</p>
              <p className="text-sm text-secondary whitespace-pre-wrap">{project.completion_summary}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {project.tech_stack.map((tech) => (
              <span key={tech} className="text-xs px-2 py-1 rounded-md bg-surface text-navy">{tech}</span>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-secondary mb-6">
            {project.duration_weeks && <span>{project.duration_weeks} weeks</span>}
            {project.weekly_hours && <span>{project.weekly_hours} hrs / week</span>}
            {project.timezone && <span>{project.timezone}</span>}
          </div>

          {project.github_repo_url ? (
            <a href={project.github_repo_url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:text-accent-hover mb-8 inline-block">
              View on GitHub →
            </a>
          ) : isOwner && (
            <div className="mb-8">
              <button
                onClick={handleCreateGithubRepo}
                disabled={creatingGithubRepo}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-navy hover:bg-surface disabled:opacity-50"
              >
                {creatingGithubRepo ? "Creating GitHub repo..." : "Create GitHub repo"}
              </button>

              {githubRepoError && <p className="text-sm text-red-500 mt-2">{githubRepoError}</p>}

              {githubRepoResult && (
                <div className="mt-2">
                  <p className="text-sm text-navy">
                    GitHub repo created!{" "}
                    <a
                      href={githubRepoResult.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:text-accent-hover font-medium"
                    >
                      View on GitHub →
                    </a>
                  </p>
                  {githubRepoResult.not_connected.length > 0 && (
                    <p className="text-xs text-secondary mt-1">
                      {githubRepoResult.not_connected.length} team member{githubRepoResult.not_connected.length === 1 ? " hasn't" : "s haven't"} connected GitHub, so {githubRepoResult.not_connected.length === 1 ? "they" : "they"} couldn&apos;t be invited as a collaborator.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </ScrollReveal>

        <ScrollReveal className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <IconBadge icon={IconUsers} color="purple" size="sm" />
            <h2 className="text-xl font-semibold text-navy">Open positions</h2>
          </div>

          {message && (
            <p className="text-sm mb-4 text-navy">{message}</p>
          )}

          <div className="flex flex-col gap-3">
            {positions.map((position, i) => (
              <SlideIn key={position.id} index={i}>
                <div className="border border-card-border rounded-xl p-5 bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-navy break-words">{position.role_name}</p>
                    {position.description && (
                      <p className="text-sm text-secondary break-words">{position.description}</p>
                    )}
                  </div>

                  {(() => {
                    const myStatus = myApplications[position.id];

                    if (myStatus === "accepted") {
                      return (
                        <span className="text-xs px-2 py-1 rounded-md bg-green-600/10 text-green-600 font-medium shrink-0 self-start sm:self-auto">
                          You&apos;re in! ✓
                        </span>
                      );
                    }

                    if (myStatus === "pending") {
                      return (
                        <span className="text-xs px-2 py-1 rounded-md bg-surface text-secondary shrink-0 self-start sm:self-auto">
                          Applied ✓
                        </span>
                      );
                    }

                    if (position.status !== "open") {
                      return (
                        <span className="text-xs px-2 py-1 rounded-md bg-surface text-secondary shrink-0 self-start sm:self-auto">
                          filled
                        </span>
                      );
                    }

                    return (
                      <button
                        onClick={() => handleApply(position.id)}
                        disabled={applyingTo === position.id}
                        className="text-sm px-3 py-2 rounded-md bg-accent text-white hover:bg-accent-hover transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0 shrink-0 self-start sm:self-auto"
                      >
                        {applyingTo === position.id ? "Applying..." : "Apply"}
                      </button>
                    );
                  })()}
                </div>
              </SlideIn>
            ))}

            {positions.length === 0 && (
              <p className="text-secondary text-sm">No positions listed.</p>
            )}
          </div>
        </ScrollReveal>

        {isOwner && (
          <ScrollReveal className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <IconBadge icon={IconUsers} color="blue" size="sm" />
              <h2 className="text-xl font-semibold text-navy">Team</h2>
            </div>

            <div className="flex flex-col gap-3">
              {activeTeam.map((member, i) => (
                <SlideIn key={member.id} index={i}>
                  <div className="border border-card-border rounded-xl p-4 bg-card shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-navy break-words">{member.full_name || "Unnamed member"}</p>
                      {member.role_name && (
                        <p className="text-sm text-secondary">{member.role_name}</p>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setMembershipTarget({
                          type: "remove",
                          memberId: member.id,
                          label: member.full_name || "This member",
                        })
                      }
                      className="text-sm px-3 py-2 rounded-md border border-red-300 text-red-600 hover:bg-red-50 font-medium transition-colors shrink-0 self-start sm:self-auto"
                    >
                      Remove
                    </button>
                  </div>
                </SlideIn>
              ))}

              {activeTeam.length === 0 && (
                <p className="text-secondary text-sm">No active team members yet.</p>
              )}
            </div>
          </ScrollReveal>
        )}

        {teamDirectory.length > 0 && (
          <ScrollReveal className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <IconBadge icon={IconUsers} color="teal" size="sm" />
              <h2 className="text-xl font-semibold text-navy">Message your team</h2>
            </div>
            <p className="text-sm text-secondary mb-4">
              Not everyone here is on Discord yet — send a teammate a message and we&apos;ll email it to them.
            </p>

            <div className="flex flex-col gap-3">
              {teamDirectory
                .filter((member) => member.user_id !== currentUserId)
                .map((member) => {
                  const canMessageOnDiscord = member.discord_connected && !!project.discord_invite_url;
                  return (
                  <div key={member.user_id} className="border border-card-border rounded-xl p-4 bg-card shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-navy break-words">{member.full_name || "Unnamed member"}</p>
                        {member.role_name && (
                          <p className="text-sm text-secondary">{member.role_name}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          <span
                            className={
                              "text-xs px-2 py-0.5 rounded-md " +
                              (member.discord_connected
                                ? "bg-green-600/10 text-green-600"
                                : "bg-surface text-secondary")
                            }
                          >
                            Discord: {member.discord_connected ? "connected" : "not connected"}
                          </span>
                          <span
                            className={
                              "text-xs px-2 py-0.5 rounded-md " +
                              (member.github_connected
                                ? "bg-green-600/10 text-green-600"
                                : "bg-surface text-secondary")
                            }
                          >
                            GitHub: {member.github_connected ? "connected" : "not connected"}
                          </span>
                        </div>
                      </div>
                      {canMessageOnDiscord ? (
                        <a
                          href={project.discord_invite_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-md border border-slate-300 text-navy hover:bg-surface font-medium transition-colors shrink-0 self-start sm:self-auto"
                        >
                          Message on Discord →
                        </a>
                      ) : (
                        <button
                          onClick={() => {
                            setMessagingTo(messagingTo === member.user_id ? null : member.user_id);
                            setMessageText("");
                          }}
                          className="text-sm px-3 py-2 rounded-md border border-slate-300 text-navy hover:bg-surface font-medium transition-colors shrink-0 self-start sm:self-auto"
                        >
                          {messagingTo === member.user_id ? "Cancel" : "Message via Ernord"}
                        </button>
                      )}
                    </div>

                    {messagingTo === member.user_id && (
                      <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-card-border">
                        <textarea
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder={`Write a message to ${member.full_name || "this teammate"}...`}
                          rows={3}
                          className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-navy text-sm placeholder:text-secondary focus:outline-none focus:border-accent resize-none"
                        />
                        <button
                          onClick={() => handleSendMessage(member.user_id)}
                          disabled={sendingMessage || !messageText.trim()}
                          className="self-end text-sm px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
                        >
                          {sendingMessage ? "Sending..." : "Send"}
                        </button>
                      </div>
                    )}

                    {messageStatus[member.user_id] && (
                      <p className="text-sm text-navy mt-2">{messageStatus[member.user_id]}</p>
                    )}
                  </div>
                  );
                })}
            </div>
          </ScrollReveal>
        )}

        {project.status === "completed" && pendingTeammates.length > 0 && (
          <ScrollReveal className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <IconBadge icon={IconStarFilled} color="gold" size="sm" />
              <h2 className="text-xl font-semibold text-navy">Rate your teammates</h2>
            </div>

            {feedbackMessage && (
              <p className="text-sm mb-4 text-navy">{feedbackMessage}</p>
            )}

            <div className="flex flex-col gap-3">
              {pendingTeammates.map((teammate) => (
                <RateTeammateCard key={teammate.id} teammate={teammate} onSubmit={handleSubmitFeedback} />
              ))}
            </div>
          </ScrollReveal>
        )}

        {project.status === "completed" && (
          <ScrollReveal className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <IconBadge icon={IconHeartHandshake} color="pink" size="sm" />
              <h2 className="text-xl font-semibold text-navy">Comments</h2>
            </div>

            <div className="flex flex-col gap-3 mb-4">
              {comments.map((comment) => (
                <div key={comment.id} className="border border-card-border rounded-xl p-4 bg-card shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center text-xs font-semibold shrink-0">
                      {(comment.author_name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-navy">{comment.author_name || "Unknown"}</p>
                      <p className="text-xs text-secondary">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-secondary">{comment.content}</p>
                </div>
              ))}

              {comments.length === 0 && (
                <p className="text-secondary text-sm">No comments yet.</p>
              )}
            </div>

            {isLoggedIn ? (
              <form onSubmit={handlePostComment} className="flex flex-col gap-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your thoughts on this project..."
                  rows={3}
                  className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-navy placeholder:text-secondary focus:outline-none focus:border-accent resize-none"
                />
                {commentError && <p className="text-sm text-red-500">{commentError}</p>}
                <button
                  type="submit"
                  disabled={postingComment || !commentText.trim()}
                  className="self-end px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0"
                >
                  {postingComment ? "Posting..." : "Post comment"}
                </button>
              </form>
            ) : (
              <p className="text-sm text-secondary">
                <a href="/login" className="text-accent hover:text-accent-hover font-medium">Log in</a> to leave a comment.
              </p>
            )}
          </ScrollReveal>
        )}
      </div>

      {showCompleteModal && (
        <CompleteProjectModal
          onCancel={() => !completing && setShowCompleteModal(false)}
          onConfirm={handleComplete}
          submitting={completing}
        />
      )}

      {membershipTarget && (
        <div
          className="fixed inset-0 bg-navy/40 flex items-center justify-center z-50 px-6"
          onClick={() => !leavingOrRemoving && setMembershipTarget(null)}
        >
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-navy mb-2">
              {membershipTarget.type === "leave"
                ? "Leave this project?"
                : `Remove ${membershipTarget.label}?`}
            </h3>
            <p className="text-sm text-secondary mb-6">
              {membershipTarget.type === "leave"
                ? "Are you sure you want to leave this project? Your position will reopen for someone else."
                : "This will remove them from the team and reopen their position for someone else."}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMembershipTarget(null)}
                disabled={leavingOrRemoving}
                className="px-4 py-2 text-sm text-secondary hover:text-navy disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMembershipAction}
                disabled={leavingOrRemoving}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {leavingOrRemoving
                  ? membershipTarget.type === "leave"
                    ? "Leaving..."
                    : "Removing..."
                  : membershipTarget.type === "leave"
                  ? "Leave"
                  : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
