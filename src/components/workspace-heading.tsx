import type { ReactNode } from "react";
import type { RecommendationMode } from "@/lib/recommendations/schemas";

export function WorkspaceHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-title-row">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>
          {title}
          <span className="heading-dot">.</span>
        </h1>
        <p className="page-subtitle">{description}</p>
      </div>
      {actions}
    </div>
  );
}

export function GenerationModeBadge({ mode }: { mode: RecommendationMode }) {
  return (
    <span className={`mode-badge ${mode === "ai" ? "mode-ai" : ""}`}>
      <span className="status-dot" aria-hidden="true" />
      {mode === "ai"
        ? "AI Mode · OpenAI"
        : mode === "demo"
          ? "Demo Mode · Simulated"
          : "Mode not configured"}
    </span>
  );
}
