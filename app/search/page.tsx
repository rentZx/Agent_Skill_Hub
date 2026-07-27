import { getResourceTags } from "@/lib/resource-filters";
import { getResources } from "@/lib/resources";
import { SearchConsole } from "@/components/search-console";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams
}: {
  searchParams?: Promise<{ query?: string }>;
}) {
  const resources = await getResources();
  const tags = getResourceTags(resources);
  const params = await searchParams;

  return <SearchConsole resources={resources} tags={tags} initialQuery={params?.query ?? ""} />;
}
