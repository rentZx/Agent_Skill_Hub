import { AdminConsole } from "@/components/admin-console";
import { getResourceTags } from "@/lib/resource-filters";
import { getResources } from "@/lib/resources";

export default async function AdminPage() {
  const resources = await getResources();
  const tags = getResourceTags(resources);

  return <AdminConsole resources={resources} tags={tags} />;
}
