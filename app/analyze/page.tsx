import { AnalyzeConsole } from "@/components/analyze-console";
import { getResources } from "@/lib/resources";

export default async function AnalyzePage() {
  const resources = await getResources();
  return <AnalyzeConsole resources={resources} />;
}
