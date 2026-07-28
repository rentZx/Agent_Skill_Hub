import {
  filterResources,
  getPopularResourceTags,
  sortResources,
  type ResourceSort
} from "@/lib/resource-filters";
import { getResources } from "@/lib/resources";
import { SearchConsole } from "@/components/search-console";
import { resourceTypes } from "@/lib/resource-types";
import type { ResourceType, RiskLevel } from "@/lib/types";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 24;

export default async function SearchPage({
  searchParams
}: {
  searchParams?: Promise<{
    query?: string;
    type?: string;
    tag?: string;
    risk?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const resources = await getResources();
  const params = await searchParams;
  const filters = {
    query: params?.query?.trim() ?? "",
    type: isResourceType(params?.type) ? params.type : "all" as const,
    tag: params?.tag?.trim() || "all",
    risk: isRiskLevel(params?.risk) ? params.risk : "all" as const,
    sort: isResourceSort(params?.sort) ? params.sort : "relevance" as const
  };
  const filteredResources = sortResources(filterResources(resources, filters), filters.sort);
  const requestedPage = Number(params?.page ?? "1");
  const pageCount = Math.max(1, Math.ceil(filteredResources.length / PAGE_SIZE));
  const page = Math.min(
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    pageCount
  );
  const pageResources = filteredResources.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const popularTags = getPopularResourceTags(resources, 120);
  if (filters.tag !== "all" && !popularTags.includes(filters.tag)) {
    popularTags.unshift(filters.tag);
  }

  return (
    <SearchConsole
      key={JSON.stringify(filters)}
      resources={pageResources}
      tags={popularTags}
      filters={filters}
      totalResults={filteredResources.length}
      totalResources={resources.length}
      page={page}
      pageCount={pageCount}
    />
  );
}

function isResourceType(value?: string): value is ResourceType {
  return resourceTypes.includes(value as ResourceType);
}

function isRiskLevel(value?: string): value is RiskLevel {
  return value === "low" || value === "medium" || value === "high";
}

function isResourceSort(value?: string): value is ResourceSort {
  return value === "relevance" || value === "trust" || value === "latest" || value === "stars";
}
