import Link from "next/link";
import { ArrowRight, Layers3 } from "lucide-react";
import { Button } from "./ui/button";
export function PlannedView({
  title,
  description,
  step,
}: {
  title: string;
  description: string;
  step: string;
}) {
  return (
    <>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">THE BUNDLELAB WORKFLOW</p>
          <h1>
            {title}
            <span className="heading-dot">.</span>
          </h1>
          <p className="page-subtitle">{description}</p>
        </div>
        <span className="workspace-pill planned-pill">Planned milestone</span>
      </div>
      <section className="planned-feature">
        <div className="planned-symbol">
          <Layers3 size={44} strokeWidth={1} />
        </div>
        <span className="eyebrow">{step}</span>
        <h2>A considered next step.</h2>
        <p>
          This workspace is reserved for {title.toLowerCase()}. It is not
          available yet. Start with the catalog to explore products, inspect
          their economics, or import your own collection.
        </p>
        <Button asChild className="action-button">
          <Link href="/catalog">
            Explore the catalog
            <ArrowRight size={16} />
          </Link>
        </Button>
        <span className="small-muted">
          No AI calls or generated recommendations in this milestone.
        </span>
      </section>
    </>
  );
}
