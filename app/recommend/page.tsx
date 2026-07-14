import { getResources } from "@/lib/resources";
import { RecommendationConsole } from "@/components/recommendation-console";

export default async function RecommendPage() {
  const resources = await getResources();

  return <RecommendationConsole resources={resources} />;
}
