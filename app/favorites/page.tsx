import { getResources } from "@/lib/resources";
import { FavoritesConsole } from "@/components/favorites-console";

export default async function FavoritesPage() {
  const resources = await getResources();

  return <FavoritesConsole resources={resources} />;
}
