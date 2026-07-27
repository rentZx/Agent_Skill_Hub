import { getResources } from "@/lib/resources";
import { RecommendationConsole } from "@/components/recommendation-console";

export const dynamic = "force-dynamic";

export default async function RecommendPage() {
  const resources = await getResources();

  return <RecommendationConsole resources={resources} />;
}
