import { AnalyzeConsole } from "@/components/analyze-console";
import { analyzeProject } from "@/lib/project-analyzer";
import { getResources } from "@/lib/resources";

export const dynamic = "force-dynamic";
const initialInput = "我要开发一个画室管理系统";

export default async function AnalyzePage() {
  const resources = await getResources();
  const initialResult = analyzeProject(initialInput, resources);
  return <AnalyzeConsole initialInput={initialInput} initialResult={initialResult} />;
}
