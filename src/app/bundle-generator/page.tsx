import { Generator } from "@/components/bundles/generator";
import { aiConfigured, recommendationMode } from "@/lib/server/config";
export const dynamic = "force-dynamic";
export default function Page() {
  return <Generator mode={recommendationMode()} configured={aiConfigured()} />;
}
