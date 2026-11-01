"use client";
import { useEffect, useState } from "react";

export const DESIGN_PREVIEW_KEY = "bundlelab:design-preview:v1";
export type DesignPreview = "editorial" | "original";

export function useDesignPreview() {
  const [design, setDesign] = useState<DesignPreview>("editorial");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    try {
      const restored = localStorage.getItem(DESIGN_PREVIEW_KEY);
      if (restored === "original" || restored === "editorial") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore only the independent browser appearance preference after hydration.
        setDesign(restored);
      }
    } catch {
      // The comparison remains usable in memory when browser storage is unavailable.
    }
  }, []);
  function chooseDesign(next: DesignPreview) {
    setDesign(next);
    setNotice("");
    try {
      localStorage.setItem(DESIGN_PREVIEW_KEY, next);
    } catch {
      setNotice(
        "Design changed for this tab. Your browser could not remember this preference.",
      );
    }
  }
  return { design, chooseDesign, notice };
}

export function DesignPreviewControl({
  design,
  onChange,
  notice,
}: {
  design: DesignPreview;
  onChange: (design: DesignPreview) => void;
  notice: string;
}) {
  return (
    <div className="design-preview-control">
      <fieldset className="design-preview-switch">
        <legend>Design preview</legend>
        <div>
          <button
            type="button"
            aria-pressed={design === "editorial"}
            onClick={() => onChange("editorial")}
          >
            Editorial
          </button>
          <button
            type="button"
            aria-pressed={design === "original"}
            onClick={() => onChange("original")}
          >
            Original
          </button>
        </div>
      </fieldset>
      {notice && (
        <p role="status" className="design-preview-notice">
          {notice}
        </p>
      )}
    </div>
  );
}
