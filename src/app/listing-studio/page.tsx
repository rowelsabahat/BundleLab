import { ListingStudio } from "@/components/listings/listing-studio";
import { aiConfigured, recommendationMode } from "@/lib/server/config";
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <ListingStudio mode={recommendationMode()} configured={aiConfigured()} />
  );
}
