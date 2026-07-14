import { getResourceTags } from "@/lib/resource-filters";
import { getResources } from "@/lib/resources";
import { SearchConsole } from "@/components/search-console";

export default async function SearchPage() {
  const resources = await getResources();
  const tags = getResourceTags(resources);

  return <SearchConsole resources={resources} tags={tags} />;
}
