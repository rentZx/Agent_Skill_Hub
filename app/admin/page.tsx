import { notFound } from "next/navigation";
import { AdminConsole } from "@/components/admin-console";
import { getResourceTags } from "@/lib/resource-filters";
import { getResources } from "@/lib/resources";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const resources = await getResources();
  const tags = getResourceTags(resources);

  return <AdminConsole resources={resources} tags={tags} />;
}
