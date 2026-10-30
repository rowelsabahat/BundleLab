"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state" role="alert">
      <h1>Something interrupted this workspace.</h1>
      <p>
        Reload this view to try again. Your saved imports remain in this
        browser.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
