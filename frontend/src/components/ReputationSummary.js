import ScrollReveal from "@/components/ScrollReveal";
import IconBadge from "@/components/IconBadge";
import { StarRatingDisplay } from "@/components/StarRating";
import { IconStarFilled } from "@/components/icons/TablerIcons";

// Reputation summary shown at the top of a profile: overall + per-criterion average
// stars, how many teammates have rated this person, and their most recent comments.
// Renders nothing until the person has received at least one piece of feedback.
export default function ReputationSummary({ reputation, feedback }) {
  if (!reputation || !reputation.feedback_count) {
    return null;
  }

  const recentComments = (feedback?.feedback || []).filter((f) => f.comment).slice(0, 3);

  return (
    <ScrollReveal className="mb-10">
      <div className="flex items-center gap-3 mb-3">
        <IconBadge icon={IconStarFilled} color="gold" size="sm" />
        <h2 className="text-base font-semibold text-navy">Reputation</h2>
      </div>

      <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <StarRatingDisplay rating={reputation.avg_overall} size="w-5 h-5" />
          <span className="text-lg font-semibold text-navy">{reputation.avg_overall}</span>
          <span className="text-sm text-secondary">
            from {reputation.feedback_count} teammate{reputation.feedback_count === 1 ? "" : "s"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-secondary mb-1">Communication</p>
            <StarRatingDisplay rating={reputation.avg_communication} size="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs text-secondary mb-1">Reliability</p>
            <StarRatingDisplay rating={reputation.avg_reliability} size="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs text-secondary mb-1">Code quality</p>
            <StarRatingDisplay rating={reputation.avg_code_quality} size="w-3.5 h-3.5" />
          </div>
        </div>

        {recentComments.length > 0 && (
          <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
            {recentComments.map((c) => (
              <div key={c.id}>
                <p className="text-sm text-secondary">&quot;{c.comment}&quot;</p>
                <p className="text-xs text-secondary mt-1">— {c.from_user_name}, {c.project_title}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollReveal>
  );
}
