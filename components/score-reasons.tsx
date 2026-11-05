import type { Evaluation } from "@/lib/selection";

export function ScoreReasons({ evaluation }: { evaluation: Evaluation }) {
  const reasons = evaluation.reasons
    .map(({ points, label }) => `+${points} ${label}`)
    .join(" · ");

  return (
    <p className="mt-0.5 font-mono text-[10px] text-muted">
      <span className="mr-1.5 font-medium text-accent tabular-nums">
        {evaluation.score}
      </span>
      {reasons}
    </p>
  );
}
